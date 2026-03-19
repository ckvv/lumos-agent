import type { ActiveMcpRegistryEntry } from '#main/services/agent/mcp'
import type { ChatInvocationMetadata, ChatToolResultDetails, SkillDetail } from '#shared/agent/types'
import type { ImageContent, TextContent } from '@mariozechner/pi-ai'
import type { CreateAgentSessionOptions } from '@mariozechner/pi-coding-agent'
import { getEnabledBuiltinTools } from '#main/services/agent/builtin-tools'
import { getActiveMcpRegistry } from '#main/services/agent/mcp'
import { getActiveSkillRegistry } from '#main/services/agent/skills'
import { buildMcpToolName, buildMcpWrapperToolName, buildSkillToolName } from '#shared/agent/tool-names'
import { ORPCError } from '@orpc/server'

type ChatAgentTool = NonNullable<CreateAgentSessionOptions['tools']>[number]

export interface ChatToolBinding {
  displayLabel: string
  source: ChatToolResultDetails['source']
  tool: ChatAgentTool
}

export interface PreparedChatCapabilities {
  explicitSkillInstruction: string | null
  invocationMetadata: ChatInvocationMetadata
  systemPromptSegments: string[]
  toolBindings: ChatToolBinding[]
}

function toObjectSchema(properties: Record<string, unknown> = {}, required: string[] = []) {
  return {
    additionalProperties: false,
    properties,
    required,
    type: 'object',
  }
}

function stringifyPayload(payload: unknown) {
  try {
    return JSON.stringify(payload, null, 2)
  }
  catch {
    return String(payload)
  }
}

function buildTextBlocksFromUnknown(payload: unknown): TextContent[] {
  return [{
    text: stringifyPayload(payload),
    type: 'text',
  }]
}

function buildSource(kind: ChatToolResultDetails['source']['kind'], id: number | string, label: string) {
  return {
    id,
    kind,
    label,
  } as const
}

function formatMcpCallToolResult(
  result: {
    content?: unknown[]
    isError?: boolean
    structuredContent?: unknown
  },
  source: ChatToolResultDetails['source'],
  displayLabel: string,
) {
  const contentBlocks: Array<TextContent | ImageContent> = []

  for (const block of result.content ?? []) {
    if (typeof block === 'object' && block && 'type' in block && block.type === 'text' && 'text' in block) {
      contentBlocks.push({
        text: String(block.text),
        type: 'text',
      })
      continue
    }

    if (typeof block === 'object' && block && 'type' in block && block.type === 'image' && 'data' in block && 'mimeType' in block) {
      contentBlocks.push({
        data: String(block.data),
        mimeType: String(block.mimeType),
        type: 'image',
      })
      continue
    }

    if (typeof block === 'object' && block && 'type' in block && block.type === 'resource' && 'resource' in block && typeof block.resource === 'object' && block.resource) {
      if ('text' in block.resource) {
        contentBlocks.push({
          text: String(block.resource.text),
          type: 'text',
        })
      }
      else {
        contentBlocks.push({
          text: stringifyPayload(block.resource),
          type: 'text',
        })
      }

      continue
    }

    contentBlocks.push({
      text: stringifyPayload(block),
      type: 'text',
    })
  }

  const normalizedContent = contentBlocks.length > 0
    ? contentBlocks
    : buildTextBlocksFromUnknown(result.structuredContent ?? result)

  return {
    content: normalizedContent,
    details: {
      payload: result,
      source,
      summary: result.isError ? 'MCP tool execution returned an error' : null,
      toolDisplayLabel: displayLabel,
    } satisfies ChatToolResultDetails,
  }
}

function buildSkillTool(detail: SkillDetail): ChatToolBinding {
  const source = buildSource('skill', detail.id, detail.name)
  const toolName = buildSkillToolName(detail.name)

  return {
    displayLabel: detail.name,
    source,
    tool: {
      description: detail.description || `Use the ${detail.name} skill instructions.`,
      execute: async (_toolCallId, params) => ({
        content: [{
          text: [
            `Skill: ${detail.name}`,
            detail.description ? `Description: ${detail.description}` : null,
            `Location: ${detail.filePath}`,
            '',
            detail.rawContent,
          ].filter(Boolean).join('\n'),
          type: 'text',
        }],
        details: {
          payload: {
            filePath: detail.filePath,
            frontmatter: detail.frontmatter,
            request: params?.request ?? null,
            skillId: detail.id,
          },
          source,
          summary: detail.description || null,
          toolDisplayLabel: detail.name,
        } satisfies ChatToolResultDetails,
      }),
      label: `Skill · ${detail.name}`,
      name: toolName,
      parameters: toObjectSchema({
        request: {
          description: 'The current user request or task you want this skill to guide.',
          type: 'string',
        },
      }) as never,
    },
  }
}

function buildMcpToolBindings(entry: ActiveMcpRegistryEntry): ChatToolBinding[] {
  const snapshot = entry.detail.inspectResult

  if (!snapshot)
    return []

  const source = buildSource('mcp', entry.detail.id, entry.detail.displayName)
  const bindings: ChatToolBinding[] = snapshot.tools.map((toolSummary) => {
    const toolName = buildMcpToolName(entry.detail.id, toolSummary.name)

    return {
      displayLabel: toolSummary.name,
      source,
      tool: {
        description: toolSummary.description || `Call the ${toolSummary.name} MCP tool from ${entry.detail.displayName}.`,
        execute: async (_toolCallId, params) => {
          const result = await entry.client.callTool({
            arguments: (params ?? {}) as Record<string, unknown>,
            name: toolSummary.name,
          })

          return formatMcpCallToolResult(result as {
            content?: unknown[]
            isError?: boolean
            structuredContent?: unknown
          }, source, toolSummary.name)
        },
        label: `MCP · ${entry.detail.displayName} · ${toolSummary.name}`,
        name: toolName,
        parameters: (toolSummary.inputSchema ?? toObjectSchema()) as never,
      },
    }
  })

  bindings.push({
    displayLabel: `${entry.detail.displayName} list resources`,
    source,
    tool: {
      description: `List resources exposed by the ${entry.detail.displayName} MCP server.`,
      execute: async () => {
        const result = await entry.client.listResources().catch(() => ({ resources: [] }))

        return {
          content: buildTextBlocksFromUnknown(result.resources),
          details: {
            payload: result.resources,
            source,
            summary: 'MCP resources list',
            toolDisplayLabel: `${entry.detail.displayName} list resources`,
          } satisfies ChatToolResultDetails,
        }
      },
      label: `MCP · ${entry.detail.displayName} · list resources`,
      name: buildMcpWrapperToolName(entry.detail.id, 'list_resources'),
      parameters: toObjectSchema() as never,
    },
  })

  bindings.push({
    displayLabel: `${entry.detail.displayName} read resource`,
    source,
    tool: {
      description: `Read one resource from the ${entry.detail.displayName} MCP server by URI.`,
      execute: async (_toolCallId, params) => {
        const result = await entry.client.readResource({
          uri: String(params?.uri ?? ''),
        })

        return {
          content: buildTextBlocksFromUnknown(result.contents),
          details: {
            payload: result,
            source,
            summary: 'MCP resource contents',
            toolDisplayLabel: `${entry.detail.displayName} read resource`,
          } satisfies ChatToolResultDetails,
        }
      },
      label: `MCP · ${entry.detail.displayName} · read resource`,
      name: buildMcpWrapperToolName(entry.detail.id, 'read_resource'),
      parameters: toObjectSchema({
        uri: {
          description: 'The resource URI to read from the MCP server.',
          type: 'string',
        },
      }, ['uri']) as never,
    },
  })

  bindings.push({
    displayLabel: `${entry.detail.displayName} list prompts`,
    source,
    tool: {
      description: `List prompts exposed by the ${entry.detail.displayName} MCP server.`,
      execute: async () => {
        const result = await entry.client.listPrompts().catch(() => ({ prompts: [] }))

        return {
          content: buildTextBlocksFromUnknown(result.prompts),
          details: {
            payload: result.prompts,
            source,
            summary: 'MCP prompts list',
            toolDisplayLabel: `${entry.detail.displayName} list prompts`,
          } satisfies ChatToolResultDetails,
        }
      },
      label: `MCP · ${entry.detail.displayName} · list prompts`,
      name: buildMcpWrapperToolName(entry.detail.id, 'list_prompts'),
      parameters: toObjectSchema() as never,
    },
  })

  bindings.push({
    displayLabel: `${entry.detail.displayName} get prompt`,
    source,
    tool: {
      description: `Get one prompt template from the ${entry.detail.displayName} MCP server.`,
      execute: async (_toolCallId, params) => {
        const result = await entry.client.getPrompt({
          arguments: typeof params?.arguments === 'object' && params.arguments
            ? params.arguments as Record<string, string>
            : undefined,
          name: String(params?.name ?? ''),
        })

        return {
          content: buildTextBlocksFromUnknown(result),
          details: {
            payload: result,
            source,
            summary: 'MCP prompt contents',
            toolDisplayLabel: `${entry.detail.displayName} get prompt`,
          } satisfies ChatToolResultDetails,
        }
      },
      label: `MCP · ${entry.detail.displayName} · get prompt`,
      name: buildMcpWrapperToolName(entry.detail.id, 'get_prompt'),
      parameters: {
        additionalProperties: false,
        properties: {
          arguments: {
            additionalProperties: {
              type: 'string',
            },
            description: 'Optional prompt template arguments.',
            type: 'object',
          },
          name: {
            description: 'The prompt name to resolve.',
            type: 'string',
          },
        },
        required: ['name'],
        type: 'object',
      } as never,
    },
  })

  return bindings
}

export async function prepareChatCapabilities(explicitSkillName: string | null): Promise<PreparedChatCapabilities> {
  const [activeBuiltinTools, activeMcpEntries, activeSkills] = await Promise.all([
    getEnabledBuiltinTools(),
    getActiveMcpRegistry(),
    getActiveSkillRegistry(),
  ])

  const invocationMetadata: ChatInvocationMetadata = {
    activeBuiltinTools: activeBuiltinTools.map(tool => ({
      id: tool.summary.name,
      label: tool.summary.label,
    })),
    activeMcpServers: activeMcpEntries.map(entry => ({
      id: entry.detail.id,
      label: entry.detail.displayName,
    })),
    activeSkills: activeSkills.map(skill => ({
      id: skill.id,
      label: skill.name,
    })),
    explicitSkillId: null,
    explicitSkillName: null,
  }

  const builtinToolBindings = activeBuiltinTools.map((tool) => {
    return {
      displayLabel: tool.summary.label,
      source: buildSource('builtin', tool.summary.name, tool.summary.label),
      tool: tool.tool,
    } satisfies ChatToolBinding
  })

  const autonomousSkillBindings = activeSkills
    .filter(skill => !skill.disableModelInvocation)
    .map(buildSkillTool)

  let explicitSkillBinding: ChatToolBinding | null = null

  if (explicitSkillName) {
    const detail = activeSkills.find(skill => skill.name === explicitSkillName) ?? null

    if (!detail) {
      throw new ORPCError('BAD_REQUEST', {
        message: `Skill "${explicitSkillName}" is not enabled`,
      })
    }

    invocationMetadata.explicitSkillId = detail.id
    invocationMetadata.explicitSkillName = detail.name
    explicitSkillBinding = buildSkillTool(detail)
  }

  const toolBindings = [
    ...builtinToolBindings,
    ...activeMcpEntries.flatMap(entry => buildMcpToolBindings(entry)),
    ...autonomousSkillBindings,
  ]

  if (explicitSkillBinding && !toolBindings.some(binding => binding.tool.name === explicitSkillBinding.tool.name))
    toolBindings.push(explicitSkillBinding)

  const explicitSkillInstruction = explicitSkillBinding
    ? `For this request, call the tool "${explicitSkillBinding.tool.name}" exactly once before you answer the user. Treat its tool result as task-specific guidance.`
    : null

  const systemPromptSegments = [
    builtinToolBindings.length > 0
      ? 'Enabled built-in workspace tools are exposed as tools. Use them for local inspection, search, editing, file writes, and shell commands when managed workspace access would materially help.'
      : '',
    activeMcpEntries.length > 0
      ? 'Enabled MCP servers are already connected and exposed as tools. Use them whenever external actions, resources, or prompts would improve the answer.'
      : '',
    autonomousSkillBindings.length > 0
      ? 'Enabled skills are exposed as tools. Invoke a matching skill tool when the user request fits its specialization.'
      : '',
  ].filter(Boolean)

  return {
    explicitSkillInstruction,
    invocationMetadata,
    systemPromptSegments,
    toolBindings,
  }
}
