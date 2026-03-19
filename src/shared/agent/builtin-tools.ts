export const builtinChatToolAccessKinds = [
  'execute',
  'read',
  'write',
] as const

export type BuiltinChatToolAccessKind = (typeof builtinChatToolAccessKinds)[number]

export const builtinChatToolDefinitions = [
  {
    access: 'read',
    description: 'Read file contents from the managed workspace.',
    label: 'Read',
    name: 'read',
  },
  {
    access: 'read',
    description: 'Search file contents with ripgrep-style matching.',
    label: 'Grep',
    name: 'grep',
  },
  {
    access: 'read',
    description: 'Find files by glob pattern inside the managed workspace.',
    label: 'Find',
    name: 'find',
  },
  {
    access: 'read',
    description: 'List directories and files in the managed workspace.',
    label: 'List',
    name: 'ls',
  },
  {
    access: 'write',
    description: 'Make surgical edits to existing files.',
    label: 'Edit',
    name: 'edit',
  },
  {
    access: 'write',
    description: 'Create or overwrite files in the managed workspace.',
    label: 'Write',
    name: 'write',
  },
  {
    access: 'execute',
    description: 'Run shell commands with the managed workspace as the default working directory.',
    label: 'Bash',
    name: 'bash',
  },
] as const

export const builtinChatToolNames = builtinChatToolDefinitions.map(tool => tool.name)

export type BuiltinChatToolDefinition = (typeof builtinChatToolDefinitions)[number]
export type BuiltinChatToolName = (typeof builtinChatToolNames)[number]

const builtinToolDefinitionMap = new Map(
  builtinChatToolDefinitions.map(tool => [tool.name, tool]),
)

export function getBuiltinChatToolDefinition(name: string): BuiltinChatToolDefinition | null {
  return builtinToolDefinitionMap.get(name as BuiltinChatToolName) ?? null
}

export function isBuiltinChatToolName(name: string): name is BuiltinChatToolName {
  return builtinToolDefinitionMap.has(name as BuiltinChatToolName)
}
