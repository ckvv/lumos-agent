const INVALID_TOOL_NAME_RE = /[^\w-]+/g
const MULTIPLE_UNDERSCORE_RE = /_+/g
const LEADING_OR_TRAILING_UNDERSCORE_RE = /^_+|_+$/g
const DOUBLE_UNDERSCORE_RE = /__/g
const SINGLE_UNDERSCORE_RE = /_/g

function sanitizeToolSegment(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(INVALID_TOOL_NAME_RE, '_')
    .replace(MULTIPLE_UNDERSCORE_RE, '_')
    .replace(LEADING_OR_TRAILING_UNDERSCORE_RE, '')

  return normalized || fallback
}

function hashToolSegment(value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash.toString(36)
}

function prettifyToolSegment(value: string) {
  return value
    .replace(DOUBLE_UNDERSCORE_RE, ' ')
    .replace(SINGLE_UNDERSCORE_RE, ' ')
    .trim()
}

export function buildSkillToolName(skillName: string) {
  return `skill__${sanitizeToolSegment(skillName, 'skill')}`
}

export function buildMcpToolName(serverId: number, rawToolName: string) {
  const normalizedToolName = sanitizeToolSegment(rawToolName, 'tool').slice(0, 40)
  return `mcp__${serverId}__${normalizedToolName}__${hashToolSegment(rawToolName)}`
}

export function buildMcpWrapperToolName(
  serverId: number,
  action: 'get_prompt' | 'list_prompts' | 'list_resources' | 'read_resource',
) {
  return `mcp__${serverId}__${action}__wrapper`
}

export function parseChatToolName(toolName: string) {
  if (toolName.startsWith('skill__')) {
    const skillName = toolName.slice('skill__'.length)

    return {
      displayLabel: prettifyToolSegment(skillName),
      kind: 'skill' as const,
      sourceId: skillName,
    }
  }

  if (!toolName.startsWith('mcp__'))
    return null

  const segments = toolName.split('__')
  const serverId = Number(segments[1])
  const rawLabel = segments[2] ?? 'tool'

  return {
    displayLabel: prettifyToolSegment(rawLabel),
    kind: 'mcp' as const,
    sourceId: Number.isFinite(serverId) ? serverId : segments[1],
  }
}
