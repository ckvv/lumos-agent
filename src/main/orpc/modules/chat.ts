import type {
  AssistantMessage,
  Message,
} from '@mariozechner/pi-ai'
import { createConversation, deleteConversation, getConversationDetail, listConversations, renameConversation, updateConversationRuntimeConfig } from '#main/services/chat/conversations'
import { persistAbortedAssistantMessage, sendConversationMessage } from '#main/services/chat/messages'
import {
  deleteCompatibleModel,
  deleteProviderConfig,
  listOAuthProviders,
  listProviderConfigs,
  saveBuiltinApiKeyProviderConfig,
  saveCompatibleModel,
  saveCompatibleProviderConfig,
  setProviderConfigEnabled,
  startOAuthLogin,
  submitOAuthManualCode,
  syncCompatibleProviderModels,
} from '#main/services/chat/providers'
import { chatToolSourceKinds } from '#shared/agent/types'
import {
  capabilityKinds,
  compatibleReasoningFormats,
  modelOrigins,
  providerAuthModes,
  providerConfigKinds,
  secretStorageModes,
  toolPolicyModes,
} from '#shared/chat/types'
import { eventIterator, os } from '@orpc/server'
import { z } from 'zod'

const messageSchema = z.custom<Message>()
const assistantMessageSchema = z.custom<AssistantMessage>()

const compatibleCompatSchema = z.object({
  maxTokensField: z.enum(['max_completion_tokens', 'max_tokens']).optional(),
  reasoningFormat: z.enum(compatibleReasoningFormats).optional(),
  requiresAssistantAfterToolResult: z.boolean().optional(),
  requiresThinkingAsText: z.boolean().optional(),
  requiresToolResultName: z.boolean().optional(),
  supportsDeveloperRole: z.boolean().optional(),
  supportsReasoningEffort: z.boolean().optional(),
  supportsStore: z.boolean().optional(),
  supportsStrictMode: z.boolean().optional(),
  supportsUsageInStreaming: z.boolean().optional(),
})

const capabilityBindingSchema = z.object({
  enabled: z.boolean(),
  identifier: z.string(),
  kind: z.enum(capabilityKinds),
})

const capabilitySnapshotItemSchema = z.object({
  id: z.union([z.number().int(), z.string()]),
  label: z.string(),
})

const invocationMetadataSchema = z.object({
  activeBuiltinTools: z.array(capabilitySnapshotItemSchema),
  activeMcpServers: z.array(capabilitySnapshotItemSchema),
  activeSkills: z.array(capabilitySnapshotItemSchema),
  explicitSkillId: z.string().nullable(),
  explicitSkillName: z.string().nullable(),
})

const runtimeConfigSchema = z.object({
  enabledCapabilities: z.array(capabilityBindingSchema),
  modelId: z.string().nullable(),
  providerConfigId: z.number().int().nullable(),
  systemPrompt: z.string(),
  toolPolicy: z.enum(toolPolicyModes),
})

const providerModelOptionSchema = z.object({
  api: z.string(),
  contextWindow: z.number().int().min(0),
  cost: z.object({
    cacheRead: z.number(),
    cacheWrite: z.number(),
    input: z.number(),
    output: z.number(),
  }),
  id: z.string(),
  input: z.array(z.enum(['image', 'text'])),
  maxTokens: z.number().int().min(0),
  name: z.string(),
  origin: z.enum(modelOrigins),
  reasoning: z.boolean(),
})

const providerConfigSummarySchema = z.object({
  authMode: z.enum(providerAuthModes),
  baseUrl: z.string().nullable(),
  displayName: z.string(),
  hasCredentials: z.boolean(),
  id: z.number().int(),
  isEnabled: z.boolean(),
  isUsable: z.boolean(),
  kind: z.enum(providerConfigKinds),
  lastSyncError: z.string().nullable(),
  models: z.array(providerModelOptionSchema),
  providerId: z.string(),
  secretStorageMode: z.enum(secretStorageModes),
})

const providerConfigDetailSchema = providerConfigSummarySchema.extend({
  compat: compatibleCompatSchema.nullable(),
  createdAt: z.string(),
  oauthProviderName: z.string().nullable(),
  updatedAt: z.string(),
})

const oauthProviderOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  usesCallbackServer: z.boolean(),
})

const oauthLoginEventSchema = z.discriminatedUnion('type', [
  z.object({
    instructions: z.string().optional(),
    providerId: z.string(),
    sessionId: z.string(),
    type: z.literal('auth_url'),
    url: z.string().url(),
  }),
  z.object({
    message: z.string(),
    providerId: z.string(),
    sessionId: z.string(),
    type: z.literal('progress'),
  }),
  z.object({
    message: z.string(),
    providerId: z.string(),
    sessionId: z.string(),
    type: z.literal('waiting_manual_code'),
  }),
  z.object({
    config: providerConfigSummarySchema,
    providerId: z.string(),
    sessionId: z.string(),
    type: z.literal('success'),
  }),
  z.object({
    message: z.string(),
    providerId: z.string(),
    recoverable: z.boolean(),
    sessionId: z.string(),
    type: z.literal('failed'),
  }),
  z.object({
    message: z.string(),
    providerId: z.string(),
    sessionId: z.string(),
    type: z.literal('canceled'),
  }),
])

const conversationSummarySchema = z.object({
  id: z.number().int(),
  lastMessageAt: z.string().nullable(),
  lastMessagePreview: z.string().nullable(),
  runtimeConfig: runtimeConfigSchema,
  title: z.string(),
  updatedAt: z.string(),
})

const conversationMessageRecordSchema = z.object({
  conversationId: z.number().int(),
  createdAt: z.string(),
  id: z.number().int(),
  invocationMetadata: invocationMetadataSchema.nullable(),
  message: messageSchema,
  role: z.enum(['assistant', 'toolResult', 'user']),
  runtimeSnapshot: runtimeConfigSchema.nullable(),
  sequence: z.number().int().min(1),
})

const conversationDetailSchema = z.object({
  conversation: conversationSummarySchema,
  messages: z.array(conversationMessageRecordSchema),
})

const toolSourceSchema = z.object({
  id: z.union([z.number().int(), z.string()]),
  kind: z.enum(chatToolSourceKinds),
  label: z.string(),
})

const toolExecutionPayloadSchema = z.object({
  args: z.unknown(),
  displayLabel: z.string(),
  source: toolSourceSchema,
  toolCallId: z.string(),
  toolName: z.string(),
})

const chatStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    conversation: conversationSummarySchema,
    invocationMetadata: invocationMetadataSchema.nullable(),
    runtimeSnapshot: runtimeConfigSchema,
    startedMessage: conversationMessageRecordSchema,
    type: z.literal('started'),
  }),
  z.object({
    conversationId: z.number().int(),
    partialMessage: assistantMessageSchema,
    type: z.literal('assistant_patch'),
  }),
  z.object({
    conversationId: z.number().int(),
    execution: toolExecutionPayloadSchema,
    type: z.literal('tool_execution_start'),
  }),
  z.object({
    conversationId: z.number().int(),
    execution: toolExecutionPayloadSchema.extend({
      partialResult: z.unknown(),
    }),
    type: z.literal('tool_execution_update'),
  }),
  z.object({
    conversationId: z.number().int(),
    execution: toolExecutionPayloadSchema.extend({
      isError: z.boolean(),
      result: z.unknown(),
    }),
    type: z.literal('tool_execution_end'),
  }),
  z.object({
    conversation: conversationSummarySchema,
    message: conversationMessageRecordSchema,
    type: z.literal('message_persisted'),
  }),
  z.object({
    conversation: conversationSummarySchema,
    type: z.literal('completed'),
  }),
  z.object({
    assistantMessage: conversationMessageRecordSchema.nullable(),
    conversation: conversationSummarySchema,
    errorMessage: z.string(),
    partialMessage: assistantMessageSchema.nullable(),
    type: z.literal('failed'),
  }),
])

const saveBuiltinApiKeyProviderInputSchema = z.object({
  apiKey: z.string().trim().min(1),
  providerId: z.string().trim().min(1),
})

const saveCompatibleProviderInputSchema = z.object({
  apiKey: z.string().trim().min(1).optional(),
  baseUrl: z.string().trim().min(1),
  compat: compatibleCompatSchema.nullable(),
  displayName: z.string().trim().min(1),
  id: z.number().int().optional(),
})

const providerConfigIdInputSchema = z.object({
  id: z.number().int(),
})

const providerConfigToggleInputSchema = providerConfigIdInputSchema.extend({
  isEnabled: z.boolean(),
})

const saveCompatibleModelInputSchema = z.object({
  contextWindow: z.number().int().min(1),
  maxTokens: z.number().int().min(1),
  modelId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  providerConfigId: z.number().int(),
  reasoning: z.boolean(),
  supportsImageInput: z.boolean(),
})

const deleteCompatibleModelInputSchema = z.object({
  modelId: z.string().trim().min(1),
  providerConfigId: z.number().int(),
})

const oauthStartInputSchema = z.object({
  providerId: z.string().trim().min(1),
})

const oauthManualCodeInputSchema = z.object({
  code: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
})

const renameConversationInputSchema = z.object({
  id: z.number().int(),
  title: z.string().trim().min(1),
})

const conversationIdInputSchema = z.object({
  id: z.number().int(),
})

const createConversationInputSchema = z.object({
  runtimeConfig: runtimeConfigSchema.partial().optional(),
}).optional()

const updateConversationRuntimeConfigInputSchema = z.object({
  id: z.number().int(),
  runtimeConfig: runtimeConfigSchema,
})

const sendMessageInputSchema = z.object({
  conversationId: z.number().int(),
  runtimeConfig: runtimeConfigSchema,
  text: z.string().trim().min(1),
})

const persistAbortedAssistantMessageInputSchema = z.object({
  conversationId: z.number().int(),
  message: assistantMessageSchema,
  runtimeConfig: runtimeConfigSchema,
})

const persistAbortedAssistantMessageResultSchema = z.object({
  assistantMessage: conversationMessageRecordSchema,
  conversation: conversationSummarySchema,
})

const okSchema = z.object({
  ok: z.literal(true),
})

export const chatRouter = {
  conversations: {
    create: os.input(createConversationInputSchema).output(conversationSummarySchema).handler(({ input }) =>
      createConversation(input?.runtimeConfig),
    ),
    delete: os.input(conversationIdInputSchema).output(okSchema).handler(({ input }) => {
      deleteConversation(input.id)
      return { ok: true as const }
    }),
    getDetail: os.input(conversationIdInputSchema).output(conversationDetailSchema).handler(({ input }) =>
      getConversationDetail(input.id),
    ),
    list: os.output(z.array(conversationSummarySchema)).handler(() => listConversations()),
    rename: os.input(renameConversationInputSchema).output(conversationSummarySchema).handler(({ input }) =>
      renameConversation(input.id, input.title),
    ),
    updateRuntimeConfig: os.input(updateConversationRuntimeConfigInputSchema).output(conversationSummarySchema).handler(({ input }) =>
      updateConversationRuntimeConfig(input.id, input.runtimeConfig),
    ),
  },
  messages: {
    persistAborted: os
      .input(persistAbortedAssistantMessageInputSchema)
      .output(persistAbortedAssistantMessageResultSchema)
      .handler(({ input }) => persistAbortedAssistantMessage(input)),
    send: os.input(sendMessageInputSchema).output(eventIterator(chatStreamEventSchema)).handler(({ input, signal }) =>
      sendConversationMessage(input, signal),
    ),
  },
  providers: {
    deleteConfig: os.input(providerConfigIdInputSchema).output(okSchema).handler(({ input }) => {
      deleteProviderConfig(input.id)
      return { ok: true as const }
    }),
    deleteCompatibleModel: os.input(deleteCompatibleModelInputSchema).output(okSchema).handler(({ input }) => {
      deleteCompatibleModel(input.providerConfigId, input.modelId)
      return { ok: true as const }
    }),
    listConfigs: os.output(z.array(providerConfigDetailSchema)).handler(() => listProviderConfigs()),
    listOAuthProviders: os.output(z.array(oauthProviderOptionSchema)).handler(() => listOAuthProviders()),
    saveBuiltinApiKeyConfig: os.input(saveBuiltinApiKeyProviderInputSchema).output(providerConfigDetailSchema).handler(({ input }) =>
      saveBuiltinApiKeyProviderConfig(input),
    ),
    saveCompatibleModel: os.input(saveCompatibleModelInputSchema).output(providerConfigDetailSchema).handler(({ input }) =>
      saveCompatibleModel(input),
    ),
    saveCompatibleProviderConfig: os.input(saveCompatibleProviderInputSchema).output(providerConfigDetailSchema).handler(({ input }) =>
      saveCompatibleProviderConfig(input),
    ),
    setEnabled: os.input(providerConfigToggleInputSchema).output(providerConfigDetailSchema).handler(({ input }) =>
      setProviderConfigEnabled(input.id, input.isEnabled),
    ),
    startOAuthLogin: os.input(oauthStartInputSchema).output(eventIterator(oauthLoginEventSchema)).handler(({ input, signal }) =>
      startOAuthLogin(input.providerId, signal),
    ),
    submitOAuthManualCode: os.input(oauthManualCodeInputSchema).output(okSchema).handler(({ input }) => {
      submitOAuthManualCode(input.sessionId, input.code)
      return { ok: true as const }
    }),
    syncCompatibleModels: os.input(providerConfigIdInputSchema).output(providerConfigDetailSchema).handler(({ input }) =>
      syncCompatibleProviderModels(input.id),
    ),
  },
}
