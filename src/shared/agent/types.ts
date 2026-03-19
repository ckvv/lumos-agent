import type { BuiltinChatToolAccessKind, BuiltinChatToolName } from '#shared/agent/builtin-tools'

export const mcpTransportKinds = [
  'stdio',
  'streamableHttp',
] as const

export type McpTransportKind = (typeof mcpTransportKinds)[number]

export const chatToolSourceKinds = [
  'builtin',
  'mcp',
  'skill',
] as const

export type ChatToolSourceKind = (typeof chatToolSourceKinds)[number]

export interface McpToolSummary {
  description: string
  inputSchema: Record<string, unknown> | null
  name: string
}

export interface McpPromptArgumentSummary {
  description: string | null
  name: string
  required: boolean
}

export interface McpPromptSummary {
  arguments: McpPromptArgumentSummary[]
  description: string
  name: string
}

export interface McpResourceSummary {
  description: string | null
  mimeType: string | null
  name: string
  uri: string
}

export interface McpInspectionSnapshot {
  capabilities: Record<string, unknown> | null
  checkedAt: string
  prompts: McpPromptSummary[]
  resources: McpResourceSummary[]
  serverName: string | null
  serverVersion: string | null
  tools: McpToolSummary[]
}

export interface McpServerSummary {
  displayName: string
  id: number
  isEnabled: boolean
  isReachable: boolean
  lastCheckedAt: string | null
  lastError: string | null
  serverName: string | null
  serverVersion: string | null
  transport: McpTransportKind
}

export interface McpServerDetail extends McpServerSummary {
  createdAt: string
  headerKeys: string[]
  inspectResult: McpInspectionSnapshot | null
  updatedAt: string
  url: string | null
  command: string | null
  args: string[]
  cwd: string | null
  envKeys: string[]
}

export type SaveMcpServerInput
  = | {
    id?: number
    displayName: string
    transport: 'stdio'
    command: string
    args?: string[]
    cwd?: string | null
    env?: Record<string, string>
  }
  | {
    id?: number
    displayName: string
    transport: 'streamableHttp'
    url: string
    headers?: Record<string, string>
  }

export interface SkillDiagnosticSummary {
  message: string
  path: string
  type: string
}

export interface SkillSummary {
  description: string
  diagnostics: SkillDiagnosticSummary[]
  disableModelInvocation: boolean
  filePath: string
  hasWarnings: boolean
  id: string
  isEnabled: boolean
  name: string
  relativePath: string
}

export interface SkillDetail extends SkillSummary {
  frontmatter: Record<string, unknown>
  rootPath: string
  source: string
  rawContent: string
}

export interface SkillListResult {
  rootPath: string
  skills: SkillSummary[]
}

export interface BuiltinToolSummary {
  access: BuiltinChatToolAccessKind
  description: string
  isEnabled: boolean
  label: string
  name: BuiltinChatToolName
}

export interface BuiltinToolListResult {
  tools: BuiltinToolSummary[]
  workspaceRoot: string
}

export interface CapabilitySnapshotItem {
  id: number | string
  label: string
}

export interface ChatInvocationMetadata {
  activeBuiltinTools: CapabilitySnapshotItem[]
  activeMcpServers: CapabilitySnapshotItem[]
  activeSkills: CapabilitySnapshotItem[]
  explicitSkillId: string | null
  explicitSkillName: string | null
}

export interface ChatToolSource {
  id: number | string
  kind: ChatToolSourceKind
  label: string
}

export interface ChatToolExecutionPayload {
  args: unknown
  displayLabel: string
  source: ChatToolSource
  toolCallId: string
  toolName: string
}

export interface ChatToolExecutionUpdatePayload extends ChatToolExecutionPayload {
  partialResult: unknown
}

export interface ChatToolExecutionEndPayload extends ChatToolExecutionPayload {
  isError: boolean
  result: unknown
}

export interface ChatToolResultDetails {
  payload: unknown
  source: ChatToolSource
  summary: string | null
  toolDisplayLabel: string
}
