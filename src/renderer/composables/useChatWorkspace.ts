import type { ChatRuntimeConfig } from '#shared/chat/types'
import { useChatStream } from '#renderer/composables/useChatStream'
import { useConversationDetail } from '#renderer/composables/useConversationDetail'
import { useConversationList } from '#renderer/composables/useConversationList'
import { useProviderSettings } from '#renderer/composables/useProviderSettings'
import { confirmAction } from '#renderer/utils/confirm'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

export function useChatWorkspace() {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()

  const providerSettings = useProviderSettings()
  const conversationList = useConversationList()
  const conversationDetail = useConversationDetail()
  const chatStream = useChatStream()

  const composerValue = shallowRef('')
  const isHistoryOpen = shallowRef(false)
  const draftRuntimeConfig = shallowRef<ChatRuntimeConfig>({
    enabledCapabilities: [],
    modelId: null,
    providerConfigId: null,
    systemPrompt: '',
    toolPolicy: 'off',
  })

  const selectedConversationId = computed<number | null>(() => {
    const value = Array.isArray(route.query.conversationId)
      ? route.query.conversationId[0]
      : route.query.conversationId

    if (!value)
      return null

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  })

  const usableConfigs = computed(() =>
    providerSettings.configs.value.filter(config => config.isUsable),
  )

  const baseRuntimeConfig = computed(() =>
    conversationDetail.conversation.value?.runtimeConfig ?? draftRuntimeConfig.value,
  )

  function resolveDefaultRuntimeConfig(source: ChatRuntimeConfig): ChatRuntimeConfig {
    if (usableConfigs.value.length === 0)
      return source

    const matchingConfig = usableConfigs.value.find(config => config.id === source.providerConfigId)
    const fallbackConfig = matchingConfig ?? usableConfigs.value[0]
    const fallbackModel = matchingConfig?.models.find(model => model.id === source.modelId)
      ?? fallbackConfig.models[0]
      ?? null

    return {
      ...source,
      modelId: fallbackModel?.id ?? null,
      providerConfigId: fallbackConfig.id,
    }
  }

  const effectiveRuntimeConfig = computed(() => resolveDefaultRuntimeConfig(baseRuntimeConfig.value))

  const selectedProviderConfig = computed(() =>
    usableConfigs.value.find(config => config.id === effectiveRuntimeConfig.value.providerConfigId) ?? null,
  )

  const providerItems = computed(() =>
    usableConfigs.value.map(config => ({
      label: config.displayName,
      value: String(config.id),
    })),
  )

  const modelItems = computed(() =>
    selectedProviderConfig.value?.models.map(model => ({
      label: model.name,
      value: model.id,
    })) ?? [],
  )

  const selectedModelName = computed(() =>
    modelItems.value.find(model => model.value === effectiveRuntimeConfig.value.modelId)?.label ?? null,
  )

  const canSend = computed(() =>
    Boolean(composerValue.value.trim())
    && !chatStream.isSending.value
    && Boolean(effectiveRuntimeConfig.value.providerConfigId)
    && Boolean(effectiveRuntimeConfig.value.modelId),
  )

  const isConversationListBusy = computed(() =>
    chatStream.isSending.value || conversationList.isMutating.value,
  )

  function buildUpdatedRuntimeConfig(partial: Partial<ChatRuntimeConfig>) {
    return {
      ...effectiveRuntimeConfig.value,
      ...partial,
    }
  }

  async function setSelectedConversation(id: number | null) {
    if (!id) {
      await router.replace({ query: {} })
      return
    }

    await router.replace({
      query: {
        conversationId: String(id),
      },
    })
  }

  async function handleConversationSelection(id: number) {
    await chatStream.stopCurrentStream()
    await setSelectedConversation(id)
    isHistoryOpen.value = false
  }

  async function handleCreateConversation() {
    const conversation = await conversationList.createConversation(effectiveRuntimeConfig.value)
    conversationList.upsertConversation(conversation)
    await setSelectedConversation(conversation.id)
    isHistoryOpen.value = false
  }

  function openConversationHistory() {
    isHistoryOpen.value = true
  }

  async function handleRenameConversation(payload: { id: number, title: string }) {
    const conversation = await conversationList.renameConversation(payload.id, payload.title)
    conversationList.upsertConversation(conversation)
    conversationDetail.replaceConversation(conversation)
  }

  async function handleDeleteConversation(id: number) {
    if (!confirmAction(t('chat.sidebar.confirmDelete')))
      return

    await conversationList.deleteConversation(id)
    conversationList.removeConversation(id)

    if (selectedConversationId.value === id) {
      const nextConversation = conversationList.conversations.value[0] ?? null
      await setSelectedConversation(nextConversation?.id ?? null)
    }
  }

  async function persistRuntimeConfig(nextRuntimeConfig: ChatRuntimeConfig) {
    if (!conversationDetail.conversation.value) {
      draftRuntimeConfig.value = nextRuntimeConfig
      return
    }

    const conversation = await conversationDetail.updateRuntimeConfig(
      conversationDetail.conversation.value.id,
      nextRuntimeConfig,
    )

    conversationList.upsertConversation(conversation)
  }

  async function handleProviderChange(value: string | number) {
    const nextConfig = usableConfigs.value.find(config => config.id === Number(value))

    if (!nextConfig)
      return

    await persistRuntimeConfig(buildUpdatedRuntimeConfig({
      modelId: nextConfig.models[0]?.id ?? null,
      providerConfigId: nextConfig.id,
    }))
  }

  async function handleModelChange(value: string | number) {
    await persistRuntimeConfig(buildUpdatedRuntimeConfig({
      modelId: String(value),
    }))
  }

  async function handleSendMessage() {
    const text = composerValue.value.trim()

    if (!text)
      return

    let conversationId = selectedConversationId.value

    if (!conversationId) {
      const conversation = await conversationList.createConversation(effectiveRuntimeConfig.value)
      conversationList.upsertConversation(conversation)
      conversationId = conversation.id
      await setSelectedConversation(conversation.id)
      await conversationDetail.load(conversation.id)
    }

    composerValue.value = ''

    await chatStream.sendMessage({
      conversationId,
      runtimeConfig: effectiveRuntimeConfig.value,
      text,
    }, {
      onEvent: (event) => {
        if (event.type === 'started') {
          conversationList.upsertConversation(event.conversation)
          conversationDetail.replaceConversation(event.conversation)
          conversationDetail.appendMessage(event.startedMessage)
          return
        }

        if (event.type === 'completed') {
          conversationList.upsertConversation(event.conversation)
          conversationDetail.replaceConversation(event.conversation)
          conversationDetail.replaceLastAssistantMessage(event.assistantMessage)
          return
        }

        if (event.type === 'failed') {
          conversationList.upsertConversation(event.conversation)
          conversationDetail.replaceConversation(event.conversation)
          conversationDetail.replaceLastAssistantMessage(event.assistantMessage)
        }
      },
    })
  }

  async function handleStopMessage() {
    await chatStream.stopCurrentStream({
      preservePartial: true,
    })
  }

  watch(usableConfigs, async (configs) => {
    if (configs.length === 0)
      return

    if (!draftRuntimeConfig.value.providerConfigId || !draftRuntimeConfig.value.modelId) {
      draftRuntimeConfig.value = resolveDefaultRuntimeConfig(draftRuntimeConfig.value)
    }
  }, { immediate: true })

  watch(selectedConversationId, async (conversationId) => {
    if (!conversationId) {
      if (conversationList.conversations.value.length > 0) {
        await setSelectedConversation(conversationList.conversations.value[0].id)
        return
      }

      conversationDetail.clear()
      return
    }

    try {
      await conversationDetail.load(conversationId)
    }
    catch {
      await conversationList.load()

      const fallbackConversation = conversationList.conversations.value[0] ?? null
      await setSelectedConversation(fallbackConversation?.id ?? null)
    }
  }, { immediate: true })

  onMounted(async () => {
    await Promise.all([
      providerSettings.load(),
      conversationList.load(),
    ])

    if (!selectedConversationId.value && conversationList.conversations.value.length > 0)
      await setSelectedConversation(conversationList.conversations.value[0].id)
  })

  return {
    canSend,
    composerValue,
    conversationCount: conversationList.conversationCount,
    conversationTitle: computed(() => conversationDetail.conversation.value?.title ?? null),
    conversations: conversationList.conversations,
    errorMessage: chatStream.errorMessage,
    handleConversationSelection,
    handleCreateConversation,
    handleDeleteConversation,
    handleModelChange,
    handleProviderChange,
    handleRenameConversation,
    handleSendMessage,
    handleStopMessage,
    isConversationListBusy,
    isConversationListLoading: conversationList.isLoading,
    isConversationLoading: conversationDetail.isLoading,
    isHistoryOpen,
    isSending: chatStream.isSending,
    messages: conversationDetail.messages,
    modelItems,
    openConversationHistory,
    partialAssistantMessage: chatStream.partialAssistantMessage,
    providerItems,
    providerLoadError: providerSettings.errorMessage,
    selectedConversationId,
    selectedModelId: computed(() => effectiveRuntimeConfig.value.modelId),
    selectedModelName,
    selectedProviderId: computed(() => effectiveRuntimeConfig.value.providerConfigId),
    selectedProviderName: computed(() => selectedProviderConfig.value?.displayName ?? null),
    sidebarErrorMessage: conversationList.errorMessage,
  }
}
