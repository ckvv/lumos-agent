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

function cloneAssistantMessage(message: AssistantMessage | null) {
  if (!message)
    return null

  return structuredClone(message)
}

function ensureUsableRuntimeConfig(runtimeConfig: ChatRuntimeConfig) {
  if (!runtimeConfig.providerConfigId || !runtimeConfig.modelId) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Choose a provider and model before sending a message',
    })
  }

  return runtimeConfig
}

export async function* sendConversationMessage(
  input: SendConversationMessageInput,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const normalizedRuntimeConfig = ensureUsableRuntimeConfig(buildDefaultRuntimeConfig(input.runtimeConfig))
  const resolvedRuntime = await resolveProviderRuntime(normalizedRuntimeConfig.providerConfigId!, normalizedRuntimeConfig.modelId!)

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
    systemPrompt: normalizedRuntimeConfig.systemPrompt || undefined,
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
        failedMessage = cloneAssistantMessage(event.error)
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
    failureReason = error instanceof Error ? error.message : 'Unknown chat streaming error'
  }

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
