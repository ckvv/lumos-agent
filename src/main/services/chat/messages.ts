import type { ChatInvocationMetadata } from '#shared/agent/types'
import type { ChatRuntimeConfig, ChatStreamEvent } from '#shared/chat/types'
import type { AgentEvent, AgentMessage } from '@mariozechner/pi-agent-core'
import type { AssistantMessage, Message } from '@mariozechner/pi-ai'
import { prepareChatCapabilities } from '#main/services/agent/chat-tools'
import { appendConversationMessage, getConversationMessages, getConversationSummary, updateConversationRuntimeConfig } from '#main/services/chat/conversations'
import { resolveProviderRuntime } from '#main/services/chat/providers'
import { buildDefaultRuntimeConfig } from '#main/services/chat/shared'
import { Agent } from '@mariozechner/pi-agent-core'
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

interface AsyncEventQueue<T> {
  close: () => void
  push: (value: T) => void
  shift: () => Promise<IteratorResult<T>>
}

const DEFAULT_CODEX_SYSTEM_PROMPT = 'You are a helpful assistant.'
const EXPLICIT_SKILL_PREFIX_RE = /^\/([a-z0-9-]+)\s*/

function createAsyncEventQueue<T>(): AsyncEventQueue<T> {
  const bufferedValues: T[] = []
  const pendingResolvers: Array<(value: IteratorResult<T>) => void> = []
  let closed = false

  function flush() {
    if (pendingResolvers.length === 0)
      return

    if (bufferedValues.length > 0) {
      const resolver = pendingResolvers.shift()
      const value = bufferedValues.shift()

      if (resolver && value !== undefined) {
        resolver({
          done: false,
          value,
        })
      }

      return
    }

    if (!closed)
      return

    while (pendingResolvers.length > 0) {
      pendingResolvers.shift()?.({
        done: true,
        value: undefined,
      })
    }
  }

  return {
    close() {
      closed = true
      flush()
    },
    push(value) {
      if (closed)
        return

      bufferedValues.push(value)
      flush()
    },
    shift() {
      if (bufferedValues.length > 0) {
        const value = bufferedValues.shift()!

        return Promise.resolve({
          done: false,
          value,
        })
      }

      if (closed) {
        return Promise.resolve({
          done: true,
          value: undefined,
        })
      }

      return new Promise<IteratorResult<T>>(resolve => pendingResolvers.push(resolve))
    },
  }
}

function cloneAssistantMessage(message: AssistantMessage | null) {
  if (!message)
    return null

  return structuredClone(message)
}

function cloneMessage<T extends Message>(message: T) {
  return structuredClone(message)
}

function isCanceledStream(signal?: AbortSignal) {
  return Boolean(signal?.aborted)
}

function resolveRequestSystemPrompt(runtimeConfig: ChatRuntimeConfig, api: string) {
  const normalizedPrompt = runtimeConfig.systemPrompt.trim()

  if (normalizedPrompt)
    return normalizedPrompt

  if (api === 'openai-codex-responses')
    return DEFAULT_CODEX_SYSTEM_PROMPT

  return undefined
}

function ensureUsableRuntimeConfig(runtimeConfig: ChatRuntimeConfig) {
  if (!runtimeConfig.providerConfigId || !runtimeConfig.modelId) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Choose a provider and model before sending a message',
    })
  }

  return runtimeConfig
}

function buildAgentSystemPrompt(
  basePrompt: string | undefined,
  capabilitySegments: string[],
  explicitSkillInstruction: string | null,
) {
  const sections = [
    basePrompt,
    ...capabilitySegments,
    explicitSkillInstruction,
  ].filter(Boolean)

  return sections.join('\n\n')
}

function parseExplicitSkillInvocation(text: string) {
  const match = text.match(EXPLICIT_SKILL_PREFIX_RE)

  if (!match) {
    return {
      explicitSkillName: null,
      normalizedText: text,
    }
  }

  const normalizedText = text.slice(match[0].length).trimStart()

  return {
    explicitSkillName: match[1] ?? null,
    normalizedText,
  }
}

function getMessagePersistenceKey(message: Message) {
  return `${message.role}:${JSON.stringify(message)}`
}

function toAgentMessages(messages: Message[]): AgentMessage[] {
  return messages.map(message => structuredClone(message))
}

function persistAgentMessage(
  conversationId: number,
  message: Message,
  runtimeConfig: ChatRuntimeConfig,
  invocationMetadata: ChatInvocationMetadata | null,
) {
  return appendConversationMessage(
    conversationId,
    cloneMessage(message),
    runtimeConfig,
    invocationMetadata,
  )
}

function mapAgentEventToChatToolEvent(event: Extract<AgentEvent, { type: 'tool_execution_end' | 'tool_execution_start' | 'tool_execution_update' }>, toolMetadata: Map<string, {
  displayLabel: string
  source: ChatInvocationMetadata['activeMcpServers'][number] & { kind: 'mcp' | 'skill' }
}>, args: unknown) {
  const metadata = toolMetadata.get(event.toolName)

  return {
    args: structuredClone(args),
    displayLabel: metadata?.displayLabel ?? event.toolName,
    source: metadata?.source ?? {
      id: event.toolName,
      kind: 'skill' as const,
      label: event.toolName,
    },
    toolCallId: event.toolCallId,
    toolName: event.toolName,
  }
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
  const { explicitSkillName, normalizedText } = parseExplicitSkillInvocation(input.text.trim())

  if (!normalizedText.trim()) {
    throw new ORPCError('BAD_REQUEST', {
      message: explicitSkillName
        ? `Please provide a prompt after /${explicitSkillName}`
        : 'Message cannot be empty',
    })
  }

  const resolvedRuntime = await resolveProviderRuntime(normalizedRuntimeConfig.providerConfigId!, normalizedRuntimeConfig.modelId!)
  const preparedCapabilities = await prepareChatCapabilities(explicitSkillName)
  const requestSystemPrompt = buildAgentSystemPrompt(
    resolveRequestSystemPrompt(normalizedRuntimeConfig, resolvedRuntime.model.api),
    preparedCapabilities.systemPromptSegments,
    preparedCapabilities.explicitSkillInstruction,
  )

  updateConversationRuntimeConfig(input.conversationId, normalizedRuntimeConfig)

  const userMessage = {
    content: normalizedText,
    role: 'user' as const,
    timestamp: Date.now(),
  }

  const startedMessage = appendConversationMessage(
    input.conversationId,
    userMessage,
    normalizedRuntimeConfig,
    preparedCapabilities.invocationMetadata,
  )
  const startedConversation = getConversationSummary(input.conversationId)

  yield {
    conversation: startedConversation,
    invocationMetadata: preparedCapabilities.invocationMetadata,
    runtimeSnapshot: normalizedRuntimeConfig,
    startedMessage,
    type: 'started',
  }

  const conversationMessages = getConversationMessages(input.conversationId).map(message => message.message)
  const eventQueue = createAsyncEventQueue<ChatStreamEvent>()
  const persistedMessageKeys = new Set<string>()
  const toolCallArgs = new Map<string, unknown>()
  let partialMessage: AssistantMessage | null = null
  let persistedFailureMessage: ReturnType<typeof appendConversationMessage> | null = null

  const toolMetadata = new Map(preparedCapabilities.toolBindings.map((binding) => {
    return [binding.tool.name, {
      displayLabel: binding.displayLabel,
      source: binding.source,
    }]
  }))

  const agent = new Agent({
    getApiKey: () => resolvedRuntime.apiKey,
    initialState: {
      messages: toAgentMessages(conversationMessages),
      model: resolvedRuntime.model,
      systemPrompt: requestSystemPrompt,
      thinkingLevel: resolvedRuntime.model.reasoning ? 'medium' : 'off',
      tools: preparedCapabilities.toolBindings.map(binding => binding.tool),
    },
    sessionId: `conversation-${input.conversationId}`,
  })

  const initialMessageCount = agent.state.messages.length

  const unsubscribe = agent.subscribe((event) => {
    if (event.type === 'message_update' && event.message.role === 'assistant') {
      partialMessage = cloneAssistantMessage(event.message)

      if (partialMessage) {
        eventQueue.push({
          conversationId: input.conversationId,
          partialMessage,
          type: 'assistant_patch',
        })
      }

      return
    }

    if (event.type === 'tool_execution_start') {
      toolCallArgs.set(event.toolCallId, structuredClone(event.args))

      eventQueue.push({
        conversationId: input.conversationId,
        execution: mapAgentEventToChatToolEvent(event, toolMetadata, event.args),
        type: 'tool_execution_start',
      })
      return
    }

    if (event.type === 'tool_execution_update') {
      toolCallArgs.set(event.toolCallId, structuredClone(event.args))

      eventQueue.push({
        conversationId: input.conversationId,
        execution: {
          ...mapAgentEventToChatToolEvent(event, toolMetadata, event.args),
          partialResult: structuredClone(event.partialResult),
        },
        type: 'tool_execution_update',
      })
      return
    }

    if (event.type === 'tool_execution_end') {
      const storedArgs = toolCallArgs.get(event.toolCallId)

      eventQueue.push({
        conversationId: input.conversationId,
        execution: {
          ...mapAgentEventToChatToolEvent(event, toolMetadata, storedArgs ?? null),
          isError: event.isError,
          result: structuredClone(event.result),
        },
        type: 'tool_execution_end',
      })

      toolCallArgs.delete(event.toolCallId)
      return
    }

    if (event.type !== 'message_end')
      return

    if (event.message.role !== 'assistant' && event.message.role !== 'toolResult')
      return

    const persistenceKey = getMessagePersistenceKey(event.message)

    if (persistedMessageKeys.has(persistenceKey))
      return

    const persistedMessage = persistAgentMessage(
      input.conversationId,
      event.message,
      normalizedRuntimeConfig,
      preparedCapabilities.invocationMetadata,
    )

    persistedMessageKeys.add(persistenceKey)
    partialMessage = null

    eventQueue.push({
      conversation: getConversationSummary(input.conversationId),
      message: persistedMessage,
      type: 'message_persisted',
    })
  })

  const abortAgent = () => {
    agent.abort()
  }

  signal?.addEventListener('abort', abortAgent, { once: true })

  const runPromise = Promise.resolve().then(async () => {
    try {
      await agent.continue()

      if (isCanceledStream(signal))
        return

      const newMessages = agent.state.messages.slice(initialMessageCount)

      for (const message of newMessages) {
        if (message.role !== 'assistant' && message.role !== 'toolResult')
          continue

        const persistenceKey = getMessagePersistenceKey(message)

        if (persistedMessageKeys.has(persistenceKey))
          continue

        const persistedMessage = persistAgentMessage(
          input.conversationId,
          message,
          normalizedRuntimeConfig,
          preparedCapabilities.invocationMetadata,
        )

        persistedMessageKeys.add(persistenceKey)

        if (message.role === 'assistant' && message.stopReason === 'error')
          persistedFailureMessage = persistedMessage

        eventQueue.push({
          conversation: getConversationSummary(input.conversationId),
          message: persistedMessage,
          type: 'message_persisted',
        })
      }

      const latestAgentMessage = agent.state.messages.at(-1)

      if (latestAgentMessage?.role === 'assistant' && latestAgentMessage.stopReason === 'error') {
        eventQueue.push({
          assistantMessage: persistedFailureMessage,
          conversation: getConversationSummary(input.conversationId),
          errorMessage: latestAgentMessage.errorMessage ?? agent.state.error ?? 'The chat request failed',
          partialMessage,
          type: 'failed',
        })
        return
      }

      eventQueue.push({
        conversation: getConversationSummary(input.conversationId),
        type: 'completed',
      })
    }
    catch (error) {
      if (isCanceledStream(signal))
        return

      const errorMessage = error instanceof Error ? error.message : 'Unknown chat execution error'

      eventQueue.push({
        assistantMessage: persistedFailureMessage,
        conversation: getConversationSummary(input.conversationId),
        errorMessage,
        partialMessage,
        type: 'failed',
      })
    }
    finally {
      unsubscribe()
      signal?.removeEventListener('abort', abortAgent)
      eventQueue.close()
    }
  })

  while (true) {
    const nextEvent = await eventQueue.shift()

    if (nextEvent.done)
      break

    yield nextEvent.value
  }

  await runPromise
}
