import type { ChatRuntimeConfig, ChatStreamEvent } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { consumeEventIterator } from '@orpc/client'
import { onBeforeUnmount, shallowReadonly, shallowRef } from 'vue'

const errorMessage = shallowRef<string | null>(null)
const isSending = shallowRef(false)
const partialAssistantMessage = shallowRef<AssistantMessage | null>(null)

let stopStream: (() => Promise<void>) | null = null

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
    errorMessage.value = null
    partialAssistantMessage.value = null
    isSending.value = true

    if (stopStream) {
      await stopStream()
      stopStream = null
    }

    try {
      const iterator = await runWithORPCClient(client => client.chat.messages.send(payload))

      stopStream = consumeEventIterator(iterator, {
        onError: (error) => {
          errorMessage.value = getORPCErrorMessage(error)
        },
        onEvent: (event) => {
          if (event.type === 'assistant_patch') {
            partialAssistantMessage.value = event.partialMessage
          }

          if (event.type === 'completed')
            partialAssistantMessage.value = null

          if (event.type === 'failed') {
            errorMessage.value = event.errorMessage
            partialAssistantMessage.value = event.assistantMessage ? null : event.partialMessage
          }

          handlers?.onEvent?.(event)
        },
        onFinish: () => {
          isSending.value = false
          stopStream = null
          handlers?.onFinish?.()
        },
      })
    }
    catch (error) {
      errorMessage.value = getORPCErrorMessage(error)
      isSending.value = false
      throw error
    }
  }

  async function stopCurrentStream() {
    if (!stopStream)
      return

    await stopStream()
    stopStream = null
    isSending.value = false
    partialAssistantMessage.value = null
  }

  onBeforeUnmount(() => {
    if (stopStream)
      void stopStream()
  })

  return {
    errorMessage: shallowReadonly(errorMessage),
    isSending: shallowReadonly(isSending),
    partialAssistantMessage: shallowReadonly(partialAssistantMessage),
    sendMessage,
    stopCurrentStream,
  }
}
