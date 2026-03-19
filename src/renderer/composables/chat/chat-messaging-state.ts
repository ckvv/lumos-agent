import type { createChatStreamState } from '#renderer/composables/chat/createChatStreamState'
import type { createConversationDetailState } from '#renderer/composables/chat/createConversationDetailState'
import type { createConversationListState } from '#renderer/composables/chat/createConversationListState'
import type { ChatRuntimeConfig } from '#shared/chat/types'
import type { ComputedRef, ShallowRef } from 'vue'
import { runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { computed } from 'vue'

export function createChatMessagingState(options: {
  chatStream: ReturnType<typeof createChatStreamState>
  composerValue: ShallowRef<string>
  conversationDetail: ReturnType<typeof createConversationDetailState>
  conversationList: Pick<ReturnType<typeof createConversationListState>, 'createConversation' | 'upsertConversation'>
  effectiveRuntimeConfig: ComputedRef<ChatRuntimeConfig>
  navigateToConversation: (id: number | null, options?: { replace?: boolean }) => Promise<void>
  selectedConversationId: ComputedRef<number | null>
}) {
  const currentConversationStreamState = options.chatStream.getConversationStreamState(options.selectedConversationId)

  const canSend = computed(() =>
    Boolean(options.composerValue.value.trim())
    && !currentConversationStreamState.value.isSending
    && Boolean(options.effectiveRuntimeConfig.value.providerConfigId)
    && Boolean(options.effectiveRuntimeConfig.value.modelId),
  )

  function isActiveConversation(conversationId: number) {
    return options.selectedConversationId.value === conversationId
      || options.conversationDetail.conversation.value?.id === conversationId
  }

  async function handleSendMessage() {
    const text = options.composerValue.value.trim()

    if (!text)
      return

    let conversationId = options.selectedConversationId.value

    if (!conversationId) {
      const conversation = await options.conversationList.createConversation(options.effectiveRuntimeConfig.value)
      options.conversationList.upsertConversation(conversation)
      options.conversationDetail.replaceConversation(conversation)
      conversationId = conversation.id
      await options.navigateToConversation(conversation.id, {
        replace: true,
      })
    }

    options.composerValue.value = ''

    const activeConversationId = conversationId

    await options.chatStream.sendMessage({
      conversationId,
      runtimeConfig: options.effectiveRuntimeConfig.value,
      text,
    }, {
      onEvent: (event) => {
        if (event.type === 'started') {
          options.conversationList.upsertConversation(event.conversation)

          if (!isActiveConversation(event.conversation.id))
            return

          options.conversationDetail.replaceConversation(event.conversation)
          options.conversationDetail.appendMessage(event.startedMessage)

          return
        }

        if (event.type === 'completed') {
          options.conversationList.upsertConversation(event.conversation)

          if (!isActiveConversation(event.conversation.id))
            return

          options.conversationDetail.replaceConversation(event.conversation)
          options.conversationDetail.replaceLastAssistantMessage(event.assistantMessage)

          return
        }

        if (event.type === 'failed') {
          options.conversationList.upsertConversation(event.conversation)

          if (!isActiveConversation(event.conversation.id))
            return

          options.conversationDetail.replaceConversation(event.conversation)
          options.conversationDetail.replaceLastAssistantMessage(event.assistantMessage)
        }
      },
      onFinish: () => {
        if (!isActiveConversation(activeConversationId))
          return

        void options.conversationDetail.load(activeConversationId)
      },
    })
  }

  async function handleStopMessage() {
    if (!options.selectedConversationId.value)
      return

    const activeConversationId = options.selectedConversationId.value
    const activeStreamState = options.chatStream.getConversationStreamState(() => activeConversationId)

    await options.chatStream.stopConversationStream(activeConversationId, {
      preservePartial: true,
    })

    const partialAssistantMessage = activeStreamState.value.partialAssistantMessage

    if (!partialAssistantMessage)
      return

    const { assistantMessage, conversation } = await runWithORPCClient(client =>
      client.chat.messages.persistAborted({
        conversationId: activeConversationId,
        message: partialAssistantMessage,
        runtimeConfig: options.effectiveRuntimeConfig.value,
      }),
    )

    options.conversationList.upsertConversation(conversation)

    if (isActiveConversation(activeConversationId)) {
      options.conversationDetail.replaceConversation(conversation)
      options.conversationDetail.appendMessage(assistantMessage)
    }

    await options.chatStream.stopConversationStream(activeConversationId)
  }

  return {
    canSend,
    handleSendMessage,
    handleStopMessage,
    isSending: computed(() => currentConversationStreamState.value.isSending),
    partialAssistantMessage: computed(() =>
      currentConversationStreamState.value.partialAssistantMessage,
    ),
  }
}
