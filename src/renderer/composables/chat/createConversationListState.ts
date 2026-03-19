import type { ChatRuntimeConfig, ConversationSummary } from '#shared/chat/types'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { computed, shallowReadonly, shallowRef } from 'vue'

function sortConversations(items: ConversationSummary[]) {
  const sortedItems = [...items]
  sortedItems.sort((left, right) => {
    const leftTime = left.lastMessageAt ?? left.updatedAt
    const rightTime = right.lastMessageAt ?? right.updatedAt

    return rightTime.localeCompare(leftTime)
  })

  return sortedItems
}

export function createConversationListState() {
  const conversations = shallowRef<ConversationSummary[]>([])
  const errorMessage = shallowRef<string | null>(null)
  const isLoading = shallowRef(false)
  const isMutating = shallowRef(false)

  async function load() {
    isLoading.value = true
    errorMessage.value = null

    try {
      conversations.value = sortConversations(
        await runWithORPCClient(client => client.chat.conversations.list()),
      )
    }
    catch (error) {
      errorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  async function runMutation<T>(handler: () => Promise<T>) {
    isMutating.value = true
    errorMessage.value = null

    try {
      const result = await handler()
      conversations.value = sortConversations(
        await runWithORPCClient(client => client.chat.conversations.list()),
      )
      return result
    }
    catch (error) {
      errorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isMutating.value = false
    }
  }

  async function createConversation(runtimeConfig?: Partial<ChatRuntimeConfig>) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.conversations.create({ runtimeConfig })),
    )
  }

  async function renameConversation(id: number, title: string) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.conversations.rename({ id, title })),
    )
  }

  async function deleteConversation(id: number) {
    await runMutation(() =>
      runWithORPCClient(client => client.chat.conversations.delete({ id })),
    )
  }

  function upsertConversation(conversation: ConversationSummary) {
    const index = conversations.value.findIndex(item => item.id === conversation.id)

    if (index === -1) {
      conversations.value = sortConversations([...conversations.value, conversation])
      return
    }

    const nextConversations = [...conversations.value]
    nextConversations[index] = conversation
    conversations.value = sortConversations(nextConversations)
  }

  function removeConversation(id: number) {
    conversations.value = conversations.value.filter(conversation => conversation.id !== id)
  }

  return {
    conversations: shallowReadonly(conversations),
    conversationCount: computed(() => conversations.value.length),
    createConversation,
    deleteConversation,
    errorMessage: shallowReadonly(errorMessage),
    isLoading: shallowReadonly(isLoading),
    isMutating: shallowReadonly(isMutating),
    load,
    removeConversation,
    renameConversation,
    upsertConversation,
  }
}
