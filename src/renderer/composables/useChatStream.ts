import type { ChatRuntimeConfig, ChatStreamEvent } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import type { MaybeRefOrGetter } from 'vue'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { consumeEventIterator } from '@orpc/client'
import { computed, onBeforeUnmount, shallowReadonly, shallowRef, toValue } from 'vue'

interface ConversationStreamState {
  errorMessage: string | null
  isSending: boolean
  isStopping: boolean
  partialAssistantMessage: AssistantMessage | null
}

const streamStates = shallowRef<Record<number, ConversationStreamState>>({})
const stopStreams = new Map<number, () => Promise<void>>()

function createIdleStreamState(): ConversationStreamState {
  return {
    errorMessage: null,
    isSending: false,
    isStopping: false,
    partialAssistantMessage: null,
  }
}

function getConversationStreamStateValue(conversationId: number | null) {
  if (!conversationId)
    return createIdleStreamState()

  return streamStates.value[conversationId] ?? createIdleStreamState()
}

function patchConversationStreamState(
  conversationId: number,
  patch: Partial<ConversationStreamState>,
) {
  streamStates.value = {
    ...streamStates.value,
    [conversationId]: {
      ...getConversationStreamStateValue(conversationId),
      ...patch,
    },
  }
}

function replaceConversationStreamState(conversationId: number, nextState: ConversationStreamState) {
  streamStates.value = {
    ...streamStates.value,
    [conversationId]: nextState,
  }
}

function clearConversationStreamState(conversationId: number) {
  if (!(conversationId in streamStates.value))
    return

  const nextStates = { ...streamStates.value }
  delete nextStates[conversationId]
  streamStates.value = nextStates
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
    getConversationStreamState: (conversationId: MaybeRefOrGetter<number | null>) => computed(() =>
      getConversationStreamStateValue(toValue(conversationId)),
    ),
    streamingConversationIds: computed(() =>
      Object.entries(streamStates.value)
        .filter(([, state]) => state.isSending)
        .map(([conversationId]) => Number(conversationId)),
    ),
    sendMessage,
    stopAllStreams,
    stopConversationStream,
    streamStates: shallowReadonly(streamStates),
  }
}
