import type { ChatInvocationMetadata } from '#shared/agent/types'
import type {
  ChatRuntimeConfig,
  CompatibleProviderCompat,
  ConversationSummary,
  ProviderModelOption,
} from '#shared/chat/types'
import type {
  Message,
  Model,
} from '@mariozechner/pi-ai'
import { getModels } from '@mariozechner/pi-ai'

const DEFAULT_CONVERSATION_TITLE = '新对话'
const DEFAULT_MESSAGE_PREVIEW_LENGTH = 88
const MULTIPLE_WHITESPACE_RE = /\s+/g

export function buildCapabilityFlags() {
  return {
    mcp: true,
    skills: true,
    tools: true,
  } as const
}

export function buildDefaultRuntimeConfig(partial: Partial<ChatRuntimeConfig> = {}): ChatRuntimeConfig {
  return {
    enabledCapabilities: partial.enabledCapabilities ?? [],
    modelId: partial.modelId ?? null,
    providerConfigId: partial.providerConfigId ?? null,
    systemPrompt: partial.systemPrompt ?? '',
    toolPolicy: partial.toolPolicy ?? 'off',
  }
}

export function getDefaultConversationTitle() {
  return DEFAULT_CONVERSATION_TITLE
}

export function sanitizeConversationTitle(title: string | null | undefined) {
  const normalized = title?.trim()

  if (!normalized)
    return DEFAULT_CONVERSATION_TITLE

  return normalized.slice(0, 80)
}

export function buildConversationTitleFromMessage(text: string) {
  const normalized = text.replace(MULTIPLE_WHITESPACE_RE, ' ').trim()

  if (!normalized)
    return DEFAULT_CONVERSATION_TITLE

  return normalized.slice(0, 48)
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value)
    return fallback

  try {
    return JSON.parse(value) as T
  }
  catch {
    return fallback
  }
}

export function serializeJson(value: unknown) {
  return JSON.stringify(value)
}

export function messageToPreview(message: Message) {
  switch (message.role) {
    case 'user':
      return normalizePreviewText(typeof message.content === 'string'
        ? message.content
        : message.content.map(block => block.type === 'text' ? block.text : '[image]').join(' '))
    case 'assistant':
      return normalizePreviewText(
        message.content
          .map((block) => {
            if (block.type === 'text')
              return block.text

            if (block.type === 'thinking')
              return `[thinking] ${block.thinking}`

            return `[tool] ${block.name}`
          })
          .join(' '),
      )
    case 'toolResult':
      return normalizePreviewText(
        message.content.map(block => block.type === 'text' ? block.text : '[image]').join(' '),
      )
  }
}

export function normalizePreviewText(value: string) {
  return value
    .replace(MULTIPLE_WHITESPACE_RE, ' ')
    .trim()
    .slice(0, DEFAULT_MESSAGE_PREVIEW_LENGTH)
}

export function parseRuntimeConfig(value: string | null | undefined) {
  return buildDefaultRuntimeConfig(parseJson<Partial<ChatRuntimeConfig>>(value, {}))
}

export function parseInvocationMetadata(value: string | null | undefined) {
  const parsedMetadata = parseJson<ChatInvocationMetadata | null>(value, null)

  if (!parsedMetadata)
    return null

  return {
    activeBuiltinTools: parsedMetadata.activeBuiltinTools ?? [],
    activeMcpServers: parsedMetadata.activeMcpServers ?? [],
    activeSkills: parsedMetadata.activeSkills ?? [],
    explicitSkillId: parsedMetadata.explicitSkillId ?? null,
    explicitSkillName: parsedMetadata.explicitSkillName ?? null,
  }
}

export function parseCompatibleCompat(value: string | null | undefined) {
  return parseJson<CompatibleProviderCompat | null>(value, null)
}

export function getBuiltinModels(providerId: string) {
  return getModels(providerId as Parameters<typeof getModels>[0])
}

export function toProviderModelOption(model: Model<string>, origin: ProviderModelOption['origin']): ProviderModelOption {
  return {
    api: model.api,
    contextWindow: model.contextWindow,
    cost: {
      cacheRead: model.cost.cacheRead,
      cacheWrite: model.cost.cacheWrite,
      input: model.cost.input,
      output: model.cost.output,
    },
    id: model.id,
    input: model.input,
    maxTokens: model.maxTokens,
    name: model.name,
    origin,
    reasoning: model.reasoning,
  }
}

export function compareConversationSummaries(a: ConversationSummary, b: ConversationSummary) {
  const aTime = a.lastMessageAt ?? a.updatedAt
  const bTime = b.lastMessageAt ?? b.updatedAt

  return bTime.localeCompare(aTime)
}
