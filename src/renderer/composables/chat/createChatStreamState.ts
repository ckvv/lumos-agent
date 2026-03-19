import type {
  ChatToolExecutionEndPayload,
  ChatToolExecutionPayload,
  ChatToolExecutionUpdatePayload,
} from '#shared/agent/types'
import type { ChatRuntimeConfig, ChatStreamEvent } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import { useAppToast } from '#renderer/composables/useAppToast'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { consumeEventIterator } from '@orpc/client'
import { computed, onBeforeUnmount, shallowReadonly, shallowRef, toValue } from 'vue'

interface ToolExecutionState extends ChatToolExecutionPayload {
  partialResult: unknown | null
  result: unknown | null
  status: 'error' | 'running' | 'success'
}

interface ConversationStreamState {
  errorMessage: string | null
  isSending: boolean
  isStopping: boolean
  partialAssistantMessage: AssistantMessage | null
  transientToolExecutions: ToolExecutionState[]
}

function createIdleStreamState(): ConversationStreamState {
  return {
    errorMessage: null,
    isSending: false,
    isStopping: false,
    partialAssistantMessage: null,
    transientToolExecutions: [],
  }
}

export function createChatStreamState() {
  const appToast = useAppToast()

  const idleStreamState = createIdleStreamState()
  const streamStateRefs = new Map<number, ShallowRef<ConversationStreamState>>()
  const stopStreams = new Map<number, () => Promise<void>>()
  // iterator.return() 只表示“发起停止”，真正的 abort/error 可能稍后才回到 onError/onFinish。
  // 这里单独记住用户的停止意图，避免迟到的 abort 被再次渲染成“聊天请求失败”。
  const stopRequests = new Map<number, { preservePartial: boolean }>()
  const streamingConversationIds = shallowRef<number[]>([])

  function getConversationStreamStateRef(conversationId: number) {
    let stateRef = streamStateRefs.get(conversationId)

    if (!stateRef) {
      stateRef = shallowRef(createIdleStreamState())
      streamStateRefs.set(conversationId, stateRef)
    }

    return stateRef
  }

  function getConversationStreamStateValue(conversationId: number | null) {
    if (!conversationId)
      return idleStreamState

    return getConversationStreamStateRef(conversationId).value
  }

  function syncStreamingConversationId(conversationId: number, isSending: boolean) {
    const hasConversation = streamingConversationIds.value.includes(conversationId)

    if (isSending === hasConversation)
      return

    streamingConversationIds.value = isSending
      ? [...streamingConversationIds.value, conversationId]
      : streamingConversationIds.value.filter(id => id !== conversationId)
  }

  function patchConversationStreamState(
    conversationId: number,
    patch: Partial<ConversationStreamState>,
  ) {
    const stateRef = getConversationStreamStateRef(conversationId)
    stateRef.value = {
      ...stateRef.value,
      ...patch,
    }
    syncStreamingConversationId(conversationId, stateRef.value.isSending)
  }

  function replaceConversationStreamState(conversationId: number, nextState: ConversationStreamState) {
    const stateRef = getConversationStreamStateRef(conversationId)
    stateRef.value = nextState
    syncStreamingConversationId(conversationId, nextState.isSending)
  }

  function clearConversationStreamState(conversationId: number) {
    const stateRef = streamStateRefs.get(conversationId)

    if (!stateRef) {
      syncStreamingConversationId(conversationId, false)
      return
    }

    stateRef.value = createIdleStreamState()
    syncStreamingConversationId(conversationId, false)
  }

  function rememberStopRequest(conversationId: number, options?: { preservePartial?: boolean }) {
    const preservePartial = options?.preservePartial ?? false
    const currentRequest = stopRequests.get(conversationId)

    stopRequests.set(conversationId, {
      preservePartial: (currentRequest?.preservePartial ?? false) || preservePartial,
    })
  }

  function notifyStreamError(conversationId: number, message: string) {
    appToast.error(message, {
      id: `chat-stream-error:${conversationId}:${message}`,
    })
  }

  function upsertToolExecution(
    conversationId: number,
    payload: ChatToolExecutionPayload | ChatToolExecutionUpdatePayload | ChatToolExecutionEndPayload,
    patch: Partial<ToolExecutionState>,
  ) {
    const state = getConversationStreamStateValue(conversationId)
    const nextExecutions = [...state.transientToolExecutions]
    const currentIndex = nextExecutions.findIndex(execution => execution.toolCallId === payload.toolCallId)
    const nextExecution: ToolExecutionState = {
      args: payload.args,
      displayLabel: payload.displayLabel,
      partialResult: 'partialResult' in payload ? payload.partialResult : currentIndex !== -1 ? nextExecutions[currentIndex].partialResult : null,
      result: 'result' in payload ? payload.result : currentIndex !== -1 ? nextExecutions[currentIndex].result : null,
      source: payload.source,
      status: currentIndex !== -1 ? nextExecutions[currentIndex].status : 'running',
      toolCallId: payload.toolCallId,
      toolName: payload.toolName,
      ...patch,
    }

    if (currentIndex === -1)
      nextExecutions.push(nextExecution)
    else
      nextExecutions[currentIndex] = nextExecution

    patchConversationStreamState(conversationId, {
      transientToolExecutions: nextExecutions,
    })
  }

  async function sendMessage(
    payload: {
      conversationId: number
      runtimeConfig: ChatRuntimeConfig
      text: string
    },
    handlers?: {
      onEvent?: (event: ChatStreamEvent) => void
      onFinish?: () => void
    },
  ) {
    if (stopStreams.has(payload.conversationId))
      await stopConversationStream(payload.conversationId)

    stopRequests.delete(payload.conversationId)
    replaceConversationStreamState(payload.conversationId, {
      errorMessage: null,
      isSending: true,
      isStopping: false,
      partialAssistantMessage: null,
      transientToolExecutions: [],
    })

    try {
      const iterator = await runWithORPCClient(client => client.chat.messages.send(payload))
      const conversationId = payload.conversationId

      stopStreams.set(conversationId, consumeEventIterator(iterator, {
        onError: (error) => {
          if (!stopRequests.has(conversationId)) {
            const message = getORPCErrorMessage(error)

            patchConversationStreamState(conversationId, {
              errorMessage: message,
            })
            notifyStreamError(conversationId, message)
          }
        },
        onEvent: (event) => {
          if (event.type === 'assistant_patch') {
            patchConversationStreamState(conversationId, {
              partialAssistantMessage: event.partialMessage,
            })
          }

          if (event.type === 'tool_execution_start') {
            upsertToolExecution(conversationId, event.execution, {
              partialResult: null,
              result: null,
              status: 'running',
            })
          }

          if (event.type === 'tool_execution_update') {
            upsertToolExecution(conversationId, event.execution, {
              partialResult: event.execution.partialResult,
              status: 'running',
            })
          }

          if (event.type === 'tool_execution_end') {
            upsertToolExecution(conversationId, event.execution, {
              result: event.execution.result,
              status: event.execution.isError ? 'error' : 'success',
            })
          }

          if (event.type === 'message_persisted' && event.message.role === 'assistant') {
            patchConversationStreamState(conversationId, {
              partialAssistantMessage: null,
            })
          }

          if (event.type === 'completed') {
            patchConversationStreamState(conversationId, {
              errorMessage: null,
              partialAssistantMessage: null,
              transientToolExecutions: [],
            })
          }

          if (event.type === 'failed') {
            if (!stopRequests.has(conversationId)) {
              patchConversationStreamState(conversationId, {
                errorMessage: event.errorMessage,
                partialAssistantMessage: event.assistantMessage ? null : event.partialMessage,
              })
              notifyStreamError(conversationId, event.errorMessage)
            }
          }

          handlers?.onEvent?.(event)
        },
        onFinish: () => {
          stopStreams.delete(conversationId)

          const state = getConversationStreamStateValue(conversationId)
          const stopRequest = stopRequests.get(conversationId) ?? null
          stopRequests.delete(conversationId)

          if (stopRequest) {
            const nextState = {
              ...state,
              errorMessage: null,
              isSending: false,
              isStopping: false,
              partialAssistantMessage: stopRequest.preservePartial ? state.partialAssistantMessage : null,
              transientToolExecutions: [],
            }

            if (!nextState.partialAssistantMessage) {
              clearConversationStreamState(conversationId)
            }
            else {
              replaceConversationStreamState(conversationId, nextState)
            }

            handlers?.onFinish?.()
            return
          }

          const nextState = {
            ...state,
            isSending: false,
            isStopping: false,
            transientToolExecutions: state.errorMessage ? state.transientToolExecutions : [],
          }

          if (!nextState.errorMessage && !nextState.partialAssistantMessage) {
            clearConversationStreamState(conversationId)
          }
          else {
            replaceConversationStreamState(conversationId, nextState)
          }

          handlers?.onFinish?.()
        },
      }))

      if (stopRequests.has(conversationId))
        await stopConversationStream(conversationId, stopRequests.get(conversationId))
    }
    catch (error) {
      if (stopRequests.has(payload.conversationId)) {
        stopRequests.delete(payload.conversationId)
        clearConversationStreamState(payload.conversationId)
        return
      }

      const message = getORPCErrorMessage(error)

      patchConversationStreamState(payload.conversationId, {
        errorMessage: message,
        isSending: false,
        isStopping: false,
      })
      notifyStreamError(payload.conversationId, message)
      throw error
    }
  }

  async function stopConversationStream(conversationId: number, options?: { preservePartial?: boolean }) {
    const preservePartial = options?.preservePartial ?? false
    const state = getConversationStreamStateValue(conversationId)
    const stopStream = stopStreams.get(conversationId)

    rememberStopRequest(conversationId, options)

    if (!stopStream) {
      if (state.isSending)
        return

      stopRequests.delete(conversationId)

      if (preservePartial)
        return

      if (!state.errorMessage && !state.partialAssistantMessage)
        return

      clearConversationStreamState(conversationId)

      return
    }

    patchConversationStreamState(conversationId, {
      isStopping: true,
    })

    await stopStream()
  }

  async function stopAllStreams(options?: { preservePartial?: boolean }) {
    await Promise.all(
      Array.from(stopStreams.keys()).map(conversationId =>
        stopConversationStream(conversationId, options),
      ),
    )
  }

  onBeforeUnmount(() => {
    void stopAllStreams()
  })

  return {
    getConversationStreamState: (conversationId: MaybeRefOrGetter<number | null>) => computed(() => {
      const resolvedConversationId = toValue(conversationId)

      if (!resolvedConversationId)
        return idleStreamState

      return getConversationStreamStateRef(resolvedConversationId).value
    }),
    sendMessage,
    stopAllStreams,
    stopConversationStream,
    streamingConversationIds: shallowReadonly(streamingConversationIds),
  }
}
