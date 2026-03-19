import type { ChatRuntimeConfig, ChatStreamEvent } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import { appendConversationMessage, getConversationMessages, getConversationSummary, updateConversationRuntimeConfig } from '#main/services/chat/conversations'
import { resolveProviderRuntime } from '#main/services/chat/providers'
import { buildDefaultRuntimeConfig } from '#main/services/chat/shared'
import { stream } from '@mariozechner/pi-ai'
import { ORPCError } from '@orpc/server'

export interface SendConversationMessageInput {
  conversationId: number
  runtimeConfig: ChatRuntimeConfig
  text: string
}

export interface PersistAbortedAssistantMessageInput {
  conversationId: number
  message: AssistantMessage
  runtimeConfig: ChatRuntimeConfig
}

const DEFAULT_CODEX_SYSTEM_PROMPT = 'You are a helpful assistant.'

function cloneAssistantMessage(message: AssistantMessage | null) {
  if (!message)
    return null

  return structuredClone(message)
}

function isCanceledStream(signal?: AbortSignal) {
  return Boolean(signal?.aborted)
}

function resolveRequestSystemPrompt(runtimeConfig: ChatRuntimeConfig, api: string) {
  const normalizedPrompt = runtimeConfig.systemPrompt.trim()

  if (normalizedPrompt)
    return normalizedPrompt

  // Codex Responses rejects empty instructions, so blank runtime prompts need a fallback.
  if (api === 'openai-codex-responses')
    return DEFAULT_CODEX_SYSTEM_PROMPT

  return undefined
}

function mergeFailedAssistantMessage(
  failedMessage: AssistantMessage | null,
  partialMessage: AssistantMessage | null,
) {
  if (!failedMessage)
    return partialMessage

  if (failedMessage.content.length > 0 || !partialMessage?.content.length)
    return failedMessage

  return {
    ...failedMessage,
    content: structuredClone(partialMessage.content),
  }
}

function ensureUsableRuntimeConfig(runtimeConfig: ChatRuntimeConfig) {
  if (!runtimeConfig.providerConfigId || !runtimeConfig.modelId) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Choose a provider and model before sending a message',
    })
  }

  return runtimeConfig
}

export function persistAbortedAssistantMessage(input: PersistAbortedAssistantMessageInput) {
  const normalizedRuntimeConfig = ensureUsableRuntimeConfig(buildDefaultRuntimeConfig(input.runtimeConfig))
  const abortedMessage: AssistantMessage = {
    ...cloneAssistantMessage(input.message)!,
    stopReason: 'aborted',
  }

  const assistantMessage = appendConversationMessage(
    input.conversationId,
    abortedMessage,
    normalizedRuntimeConfig,
  )

  return {
    assistantMessage,
    conversation: getConversationSummary(input.conversationId),
  }
}

export async function* sendConversationMessage(
  input: SendConversationMessageInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const normalizedRuntimeConfig = ensureUsableRuntimeConfig(buildDefaultRuntimeConfig(input.runtimeConfig))
  const resolvedRuntime = await resolveProviderRuntime(normalizedRuntimeConfig.providerConfigId!, normalizedRuntimeConfig.modelId!)
  const requestSystemPrompt = resolveRequestSystemPrompt(normalizedRuntimeConfig, resolvedRuntime.model.api)

  updateConversationRuntimeConfig(input.conversationId, normalizedRuntimeConfig)

  const userMessage = {
    content: input.text,
    role: 'user' as const,
    timestamp: Date.now(),
  }

  const startedMessage = appendConversationMessage(input.conversationId, userMessage, normalizedRuntimeConfig)
  const startedConversation = getConversationSummary(input.conversationId)

  yield {
    conversation: startedConversation,
    runtimeSnapshot: normalizedRuntimeConfig,
    startedMessage,
    type: 'started',
  }

  const conversationMessages = getConversationMessages(input.conversationId).map(message => message.message)
  const assistantStream = stream(resolvedRuntime.model, {
    messages: conversationMessages,
    systemPrompt: requestSystemPrompt,
  }, {
    apiKey: resolvedRuntime.apiKey,
    signal,
    sessionId: `conversation-${input.conversationId}`,
  })

  let partialMessage: AssistantMessage | null = null
  let completedMessage: AssistantMessage | null = null
  let failedMessage: AssistantMessage | null = null
  let failureReason: string | null = null

  try {
    for await (const event of assistantStream) {
      if (event.type === 'done') {
        completedMessage = cloneAssistantMessage(event.message)
        continue
      }

      if (event.type === 'error') {
        // 手动暂停会触发 provider / transport abort，这里不应该再向前端冒充成失败。
        if (isCanceledStream(signal) || event.error.stopReason === 'aborted')
          return

        failedMessage = mergeFailedAssistantMessage(
          cloneAssistantMessage(event.error),
          partialMessage,
        )
        partialMessage = failedMessage
        failureReason = event.error.errorMessage ?? 'The provider returned an error'
        continue
      }

      if ('partial' in event) {
        partialMessage = cloneAssistantMessage(event.partial)

        if (partialMessage) {
          yield {
            conversationId: input.conversationId,
            partialMessage,
            type: 'assistant_patch',
          }
        }
      }
    }
  }
  catch (error) {
    if (isCanceledStream(signal))
      return

    failureReason = error instanceof Error ? error.message : 'Unknown chat streaming error'
  }

  if (isCanceledStream(signal))
    return

  if (completedMessage) {
    const assistantMessage = appendConversationMessage(input.conversationId, completedMessage, normalizedRuntimeConfig)

    yield {
      assistantMessage,
      conversation: getConversationSummary(input.conversationId),
      type: 'completed',
    }

    return
  }

  const persistedFailureMessage = failedMessage
    ? appendConversationMessage(input.conversationId, failedMessage, normalizedRuntimeConfig)
    : null

  yield {
    assistantMessage: persistedFailureMessage,
    conversation: getConversationSummary(input.conversationId),
    errorMessage: failureReason ?? 'The chat request failed',
    partialMessage,
    type: 'failed',
  }
}
