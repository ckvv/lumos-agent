import { createChatMessagingState } from '#renderer/composables/chat/chat-messaging-state'
import { createChatRouteState, registerChatRouteSyncEffects } from '#renderer/composables/chat/chat-route-state'
import { createChatRuntimeState } from '#renderer/composables/chat/chat-runtime-state'
import { createChatStreamState } from '#renderer/composables/chat/createChatStreamState'
import { createConversationDetailState } from '#renderer/composables/chat/createConversationDetailState'
import { createConversationListState } from '#renderer/composables/chat/createConversationListState'
import { useAppToast } from '#renderer/composables/useAppToast'
import { useProviderSettings } from '#renderer/composables/useProviderSettings'
import { confirmAction } from '#renderer/utils/confirm'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

export function createChatWorkspace() {
  const { t } = useI18n()
  const appToast = useAppToast()
  const route = useRoute()
  const router = useRouter()

  const providerSettings = useProviderSettings()
  const conversationList = createConversationListState()
  const conversationDetail = createConversationDetailState()
  const chatStream = createChatStreamState()

  const composerValue = shallowRef('')
  const isHistoryOpen = shallowRef(false)

  const routeState = createChatRouteState(route, router)
  const runtimeState = createChatRuntimeState({
    conversationDetail,
    conversationList,
    providerSettings,
  })
  const messagingState = createChatMessagingState({
    chatStream,
    composerValue,
    conversationDetail,
    conversationList,
    effectiveRuntimeConfig: runtimeState.effectiveRuntimeConfig,
    navigateToConversation: routeState.navigateToConversation,
    selectedConversationId: routeState.selectedConversationId,
  })

  const selectedConversationTitle = computed(() => {
    if (!routeState.routeConversationState.value.hasParam)
      return t('chat.workspace.newConversation')

    return conversationDetail.conversation.value?.title
      ?? conversationList.conversations.value.find(item => item.id === routeState.selectedConversationId.value)?.title
      ?? t('chat.workspace.activeConversation')
  })

  const isConversationListBusy = computed(() =>
    conversationList.isMutating.value,
  )

  async function handleCreateConversation() {
    runtimeState.draftRuntimeConfig.value = {
      ...runtimeState.effectiveRuntimeConfig.value,
    }

    await routeState.navigateToConversation(null)
  }

  async function handleRenameConversation(payload: { id: number, title: string }) {
    const conversation = await conversationList.renameConversation(payload.id, payload.title)
    conversationList.upsertConversation(conversation)

    if (conversationDetail.conversation.value?.id === conversation.id)
      conversationDetail.replaceConversation(conversation)
  }

  async function handleDeleteConversation(id: number) {
    if (!confirmAction(t('chat.sidebar.confirmDelete')))
      return

    await conversationList.deleteConversation(id)
    conversationList.removeConversation(id)

    if (routeState.selectedConversationId.value !== id)
      return

    runtimeState.draftRuntimeConfig.value = {
      ...runtimeState.effectiveRuntimeConfig.value,
    }

    await routeState.navigateToConversation(null, {
      replace: true,
    })
  }

  function handleOpenHistory() {
    isHistoryOpen.value = true
  }

  registerChatRouteSyncEffects({
    conversationDetail,
    conversationList,
    legacyConversationState: routeState.legacyConversationState,
    navigateToConversation: routeState.navigateToConversation,
    routeConversationState: routeState.routeConversationState,
    selectedConversationId: routeState.selectedConversationId,
  })

  onMounted(async () => {
    await Promise.all([
      providerSettings.load(),
      conversationList.load(),
    ])
  })

  watch(
    () => providerSettings.errorMessage.value,
    (errorMessage, previousErrorMessage) => {
      if (!errorMessage || errorMessage === previousErrorMessage)
        return

      appToast.error(errorMessage, {
        id: `chat-provider-load-error:${errorMessage}`,
      })
    },
  )

  return {
    actions: {
      changeRuntime: runtimeState.handleRuntimeChange,
      createConversation: handleCreateConversation,
      deleteConversation: handleDeleteConversation,
      openHistory: handleOpenHistory,
      renameConversation: handleRenameConversation,
      selectConversation: routeState.handleConversationSelection,
      sendMessage: messagingState.handleSendMessage,
      stopMessage: messagingState.handleStopMessage,
    },
    composer: {
      canSend: messagingState.canSend,
      isSending: messagingState.isSending,
      modelSwitchGroups: runtimeState.modelSwitchGroups,
      selectedModelId: runtimeState.selectedModelId,
      selectedModelName: runtimeState.selectedModelName,
      selectedProviderId: runtimeState.selectedProviderId,
      selectedProviderName: runtimeState.selectedProviderName,
      value: composerValue,
    },
    conversation: {
      isLoading: conversationDetail.isLoading,
      isNewConversationView: routeState.isNewConversationView,
      messages: conversationDetail.messages,
      partialAssistantMessage: messagingState.partialAssistantMessage,
    },
    sidebar: {
      conversations: conversationList.conversations,
      errorMessage: conversationList.errorMessage,
      isBusy: isConversationListBusy,
      isHistoryOpen,
      isLoading: conversationList.isLoading,
      selectedConversationId: routeState.selectedConversationId,
      selectedConversationTitle,
      streamingConversationIds: chatStream.streamingConversationIds,
    },
  }
}

export type ChatWorkspace = ReturnType<typeof createChatWorkspace>
