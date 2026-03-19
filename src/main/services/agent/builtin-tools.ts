import type { BuiltinToolRecord } from '#main/database/schema'
import type { BuiltinChatToolName } from '#shared/agent/builtin-tools'
import type { BuiltinToolListResult, BuiltinToolSummary } from '#shared/agent/types'
import type { CreateAgentSessionOptions } from '@mariozechner/pi-coding-agent'
import { db } from '#main/database/database'
import { builtinTools } from '#main/database/schema'
import { ensureManagedAgentProjectPath } from '#main/services/agent/paths'
import { getPiCodingAgentModule } from '#main/services/agent/pi-coding-agent'
import { requireAuthenticatedUser } from '#main/services/auth'
import { builtinChatToolDefinitions, getBuiltinChatToolDefinition } from '#shared/agent/builtin-tools'
import { ORPCError } from '@orpc/server'

type ChatAgentTool = NonNullable<CreateAgentSessionOptions['tools']>[number]

export interface EnabledBuiltinChatTool {
  summary: BuiltinToolSummary
  tool: ChatAgentTool
}

function ensureAgentAccess() {
  requireAuthenticatedUser()
}

function getBuiltinToolRecords() {
  return db.select().from(builtinTools).all()
}

function mapBuiltinToolSummary(definition: typeof builtinChatToolDefinitions[number], record: BuiltinToolRecord | null): BuiltinToolSummary {
  return {
    access: definition.access,
    description: definition.description,
    isEnabled: record?.isEnabled ?? false,
    label: definition.label,
    name: definition.name,
  }
}

function upsertBuiltinToolRecord(name: BuiltinChatToolName, isEnabled: boolean) {
  const now = new Date().toISOString()

  db.insert(builtinTools)
    .values({
      createdAt: now,
      isEnabled,
      name,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        isEnabled,
        updatedAt: now,
      },
      target: builtinTools.name,
    })
    .run()
}

async function createBuiltinTool(name: BuiltinChatToolName, cwd: string): Promise<ChatAgentTool> {
  const module = await getPiCodingAgentModule()

  switch (name) {
    case 'bash':
      return module.createBashTool(cwd)
    case 'edit':
      return module.createEditTool(cwd)
    case 'find':
      return module.createFindTool(cwd)
    case 'grep':
      return module.createGrepTool(cwd)
    case 'ls':
      return module.createLsTool(cwd)
    case 'read':
      return module.createReadTool(cwd)
    case 'write':
      return module.createWriteTool(cwd)
  }
}

export async function listBuiltinTools(): Promise<BuiltinToolListResult> {
  ensureAgentAccess()

  const workspaceRoot = ensureManagedAgentProjectPath()
  const records = getBuiltinToolRecords()
  const recordMap = new Map(records.map(record => [record.name, record]))

  return {
    tools: builtinChatToolDefinitions.map(definition =>
      mapBuiltinToolSummary(definition, recordMap.get(definition.name) ?? null),
    ),
    workspaceRoot,
  }
}

export async function setBuiltinToolEnabled(name: string, isEnabled: boolean): Promise<BuiltinToolSummary> {
  ensureAgentAccess()

  if (!getBuiltinChatToolDefinition(name)) {
    throw new ORPCError('NOT_FOUND', {
      message: `Built-in tool "${name}" was not found`,
    })
  }

  upsertBuiltinToolRecord(name as BuiltinChatToolName, isEnabled)

  const result = await listBuiltinTools()
  const detail = result.tools.find(tool => tool.name === name)

  if (!detail) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: `Failed to persist built-in tool "${name}"`,
    })
  }

  return detail
}

export async function getEnabledBuiltinTools(): Promise<EnabledBuiltinChatTool[]> {
  const { tools, workspaceRoot } = await listBuiltinTools()
  const enabledTools = tools.filter(tool => tool.isEnabled)

  return Promise.all(enabledTools.map(async (summary) => {
    return {
      summary,
      tool: await createBuiltinTool(summary.name, workspaceRoot),
    }
  }))
}
