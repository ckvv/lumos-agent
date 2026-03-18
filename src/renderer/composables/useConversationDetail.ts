import type { ChatRuntimeConfig, ConversationDetail, ConversationMessageRecord, ConversationSummary } from '#shared/chat/types'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { computed, shallowReadonly, shallowRef } from 'vue'

const detail = shallowRef<ConversationDetail | null>(null)
const errorMessage = shallowRef<string | null>(null)
const isLoading = shallowRef(false)

export function useConversationDetail() {
  async function load(id: number) {
    isLoading.value = true
    errorMessage.value = null

    try {
      detail.value = await runWithORPCClient(client => client.chat.conversations.getDetail({ id }))
      return detail.value
    }
    catch (error) {
      detail.value = null
      errorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateRuntimeConfig(id: number, runtimeConfig: ChatRuntimeConfig) {
    const conversation = await runWithORPCClient(client =>
      client.chat.conversations.updateRuntimeConfig({
        id,
        runtimeConfig,
      }),
    )

    replaceConversation(conversation)
    return conversation
  }

  function replaceConversation(nextConversation: ConversationSummary) {
    if (!detail.value || detail.value.conversation.id !== nextConversation.id) {
      detail.value = {
        conversation: nextConversation,
        messages: [],
      }
      return
    }

    detail.value = {
      ...detail.value,
      conversation: nextConversation,
    }
  }

  function appendMessage(message: ConversationMessageRecord) {
    if (!detail.value)
      return

    detail.value = {
      ...detail.value,
      messages: [...detail.value.messages, message],
    }
  }

  function replaceLastAssistantMessage(message: ConversationMessageRecord | null) {
    if (!detail.value || !message)
      return

    const nextMessages = [...detail.value.messages]
    const lastMessageIndex = nextMessages.findIndex(item => item.id === message.id)

    if (lastMessageIndex !== -1) {
      nextMessages[lastMessageIndex] = message
    }
    else {
      nextMessages.push(message)
    }

    detail.value = {
      ...detail.value,
      messages: nextMessages,
    }
  }

  function clear() {
    detail.value = null
    errorMessage.value = null
  }

  return {
    appendMessage,
    clear,
    conversation: computed(() => detail.value?.conversation ?? null),
    detail: shallowReadonly(detail),
    errorMessage: shallowReadonly(errorMessage),
    isLoading: shallowReadonly(isLoading),
    load,
    messages: computed(() => detail.value?.messages ?? []),
    replaceConversation,
    replaceLastAssistantMessage,
    updateRuntimeConfig,
  }
}
