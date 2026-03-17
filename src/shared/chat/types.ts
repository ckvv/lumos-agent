import type {
  AssistantMessage,
  Message,
} from '@mariozechner/pi-ai'

export const capabilityKinds = [
  'tool',
  'mcp',
  'skill',
] as const

export type CapabilityKind = (typeof capabilityKinds)[number]

export const toolPolicyModes = [
  'off',
  'manual',
  'auto',
] as const

export type ToolPolicyMode = (typeof toolPolicyModes)[number]

export const providerAuthModes = [
  'apiKey',
  'oauth',
] as const

export type ProviderAuthMode = (typeof providerAuthModes)[number]

export const providerConfigKinds = [
  'builtin',
  'openaiCompatible',
] as const

export type ProviderConfigKind = (typeof providerConfigKinds)[number]

export const modelOrigins = [
  'builtin',
  'discovered',
  'manual',
] as const

export type ModelOrigin = (typeof modelOrigins)[number]

export const secretStorageModes = [
  'safeStorage',
  'plainText',
] as const

export type SecretStorageMode = (typeof secretStorageModes)[number]

export const compatibleReasoningFormats = [
  'openai',
  'qwen',
  'qwen-chat-template',
  'zai',
] as const

export type CompatibleReasoningFormat = (typeof compatibleReasoningFormats)[number]

export interface CompatibleProviderCompat {
  maxTokensField?: 'max_completion_tokens' | 'max_tokens'
  requiresAssistantAfterToolResult?: boolean
  requiresThinkingAsText?: boolean
  requiresToolResultName?: boolean
  reasoningFormat?: CompatibleReasoningFormat
  supportsDeveloperRole?: boolean
  supportsReasoningEffort?: boolean
  supportsStore?: boolean
  supportsStrictMode?: boolean
  supportsUsageInStreaming?: boolean
}

export interface CapabilityBinding {
  enabled: boolean
  identifier: string
  kind: CapabilityKind
}

export interface CapabilityFlags {
  mcp: boolean
  skills: boolean
  tools: boolean
}

export interface ChatRuntimeConfig {
  enabledCapabilities: CapabilityBinding[]
  modelId: string | null
  providerConfigId: number | null
  systemPrompt: string
  toolPolicy: ToolPolicyMode
}

export interface ProviderModelOption {
  api: string
  contextWindow: number
  cost: {
    cacheRead: number
    cacheWrite: number
    input: number
    output: number
  }
  id: string
  input: Array<'image' | 'text'>
  maxTokens: number
  name: string
  origin: ModelOrigin
  reasoning: boolean
}

export interface ProviderConfigSummary {
  authMode: ProviderAuthMode
  baseUrl: string | null
  displayName: string
  hasCredentials: boolean
  id: number
  isEnabled: boolean
  isUsable: boolean
  kind: ProviderConfigKind
  lastSyncError: string | null
  models: ProviderModelOption[]
  providerId: string
  secretStorageMode: SecretStorageMode
}

export interface ProviderConfigDetail extends ProviderConfigSummary {
  compat: CompatibleProviderCompat | null
  createdAt: string
  oauthProviderName: string | null
  updatedAt: string
}

export interface OAuthProviderOption {
  id: string
  name: string
  usesCallbackServer: boolean
}

export type OAuthLoginEvent
  = | {
    providerId: string
    sessionId: string
    type: 'auth_url'
    instructions?: string
    url: string
  }
  | {
    message: string
    providerId: string
    sessionId: string
    type: 'progress'
  }
  | {
    message: string
    providerId: string
    sessionId: string
    type: 'waiting_manual_code'
  }
  | {
    config: ProviderConfigSummary
    providerId: string
    sessionId: string
    type: 'success'
  }
  | {
    message: string
    providerId: string
    recoverable: boolean
    sessionId: string
    type: 'failed'
  }
  | {
    message: string
    providerId: string
    sessionId: string
    type: 'canceled'
  }

export interface ConversationSummary {
  id: number
  lastMessageAt: string | null
  lastMessagePreview: string | null
  runtimeConfig: ChatRuntimeConfig
  title: string
  updatedAt: string
}

export interface ConversationMessageRecord {
  conversationId: number
  createdAt: string
  id: number
  message: Message
  role: Message['role']
  runtimeSnapshot: ChatRuntimeConfig | null
  sequence: number
}

export interface ConversationDetail {
  conversation: ConversationSummary
  messages: ConversationMessageRecord[]
}

export type ChatStreamEvent
  = | {
    conversation: ConversationSummary
    runtimeSnapshot: ChatRuntimeConfig
    startedMessage: ConversationMessageRecord
    type: 'started'
  }
  | {
    conversationId: number
    partialMessage: AssistantMessage
    type: 'assistant_patch'
  }
  | {
    assistantMessage: ConversationMessageRecord
    conversation: ConversationSummary
    type: 'completed'
  }
  | {
    assistantMessage: ConversationMessageRecord | null
    conversation: ConversationSummary
    errorMessage: string
    partialMessage: AssistantMessage | null
    type: 'failed'
  }
