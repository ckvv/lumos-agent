import type { ChatRuntimeConfig, ConversationDetail, ConversationMessageRecord, ConversationSummary } from '#shared/chat/types'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { computed, shallowReadonly, shallowRef } from 'vue'

export function createConversationDetailState() {
  const detail = shallowRef<ConversationDetail | null>(null)
  const errorMessage = shallowRef<string | null>(null)
  const isLoading = shallowRef(false)

  let activeLoadToken = 0

  async function load(id: number) {
    const loadToken = ++activeLoadToken

    isLoading.value = true
    errorMessage.value = null

    try {
      const nextDetail = await runWithORPCClient(client => client.chat.conversations.getDetail({ id }))

      if (loadToken !== activeLoadToken)
        return detail.value

      detail.value = nextDetail
      return detail.value
    }
    catch (error) {
      if (loadToken === activeLoadToken) {
        detail.value = null
        errorMessage.value = getORPCErrorMessage(error)
      }

      throw error
    }
    finally {
      if (loadToken === activeLoadToken)
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

  function upsertMessage(message: ConversationMessageRecord | null) {
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
    activeLoadToken += 1
    detail.value = null
    errorMessage.value = null
    isLoading.value = false
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
    upsertMessage,
    updateRuntimeConfig,
  }
}
