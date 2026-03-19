import type { ChatRuntimeConfig, ChatStreamEvent } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { consumeEventIterator } from '@orpc/client'
import { computed, onBeforeUnmount, shallowReadonly, shallowRef, toValue } from 'vue'

interface ConversationStreamState {
  errorMessage: string | null
  isSending: boolean
  isStopping: boolean
  partialAssistantMessage: AssistantMessage | null
}

const idleStreamState = createIdleStreamState()
const streamStateRefs = new Map<number, ShallowRef<ConversationStreamState>>()
const stopStreams = new Map<number, () => Promise<void>>()
const streamingConversationIds = shallowRef<number[]>([])

function createIdleStreamState(): ConversationStreamState {
  return {
    errorMessage: null,
    isSending: false,
    isStopping: false,
    partialAssistantMessage: null,
  }
}

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

export function useChatStream() {
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

    replaceConversationStreamState(payload.conversationId, {
      errorMessage: null,
      isSending: true,
      isStopping: false,
      partialAssistantMessage: null,
    })

    try {
      const iterator = await runWithORPCClient(client => client.chat.messages.send(payload))
      const conversationId = payload.conversationId

      stopStreams.set(conversationId, consumeEventIterator(iterator, {
        onError: (error) => {
          if (!getConversationStreamStateValue(conversationId).isStopping) {
            patchConversationStreamState(conversationId, {
              errorMessage: getORPCErrorMessage(error),
            })
          }
        },
        onEvent: (event) => {
          if (event.type === 'assistant_patch') {
            patchConversationStreamState(conversationId, {
              partialAssistantMessage: event.partialMessage,
            })
          }

          if (event.type === 'completed') {
            patchConversationStreamState(conversationId, {
              errorMessage: null,
              partialAssistantMessage: null,
            })
          }

          if (event.type === 'failed') {
            if (!getConversationStreamStateValue(conversationId).isStopping) {
              patchConversationStreamState(conversationId, {
                errorMessage: event.errorMessage,
                partialAssistantMessage: event.assistantMessage ? null : event.partialMessage,
              })
            }
          }

          handlers?.onEvent?.(event)
        },
        onFinish: () => {
          stopStreams.delete(conversationId)

          const state = getConversationStreamStateValue(conversationId)
          const nextState = {
            ...state,
            isSending: false,
            isStopping: false,
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
    }
    catch (error) {
      patchConversationStreamState(payload.conversationId, {
        errorMessage: getORPCErrorMessage(error),
        isSending: false,
        isStopping: false,
      })
      throw error
    }
  }

  async function stopConversationStream(conversationId: number, options?: { preservePartial?: boolean }) {
    const preservePartial = options?.preservePartial ?? false
    const stopStream = stopStreams.get(conversationId)

    if (!stopStream) {
      if (preservePartial)
        return

      const state = getConversationStreamStateValue(conversationId)

      if (!state.errorMessage && !state.partialAssistantMessage)
        return

      clearConversationStreamState(conversationId)

      return
    }

    patchConversationStreamState(conversationId, {
      isStopping: true,
    })

    try {
      await stopStream()
    }
    finally {
      stopStreams.delete(conversationId)

      const currentState = getConversationStreamStateValue(conversationId)
      const nextState = {
        ...currentState,
        errorMessage: null,
        isSending: false,
        isStopping: false,
        partialAssistantMessage: preservePartial ? currentState.partialAssistantMessage : null,
      }

      if (!nextState.partialAssistantMessage) {
        clearConversationStreamState(conversationId)
      }
      else {
        replaceConversationStreamState(conversationId, nextState)
      }
    }
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
    streamingConversationIds: shallowReadonly(streamingConversationIds),
    sendMessage,
    stopAllStreams,
    stopConversationStream,
  }
}
