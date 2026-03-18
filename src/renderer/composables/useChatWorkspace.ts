import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import type { ChatRuntimeConfig } from '#shared/chat/types'
import type { InjectionKey } from 'vue'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { useChatStream } from '#renderer/composables/useChatStream'
import { useConversationDetail } from '#renderer/composables/useConversationDetail'
import { useConversationList } from '#renderer/composables/useConversationList'
import { useProviderSettings } from '#renderer/composables/useProviderSettings'
import { confirmAction } from '#renderer/utils/confirm'
import { computed, inject, onMounted, provide, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

function parseConversationId(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number')
    return null

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    return null

  return parsed
}

function getFirstRouteValue(value: string | string[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildChatPath(conversationId: number | null) {
  if (!conversationId)
    return '/chat'

  return `/chat/${conversationId}`
}

function buildCanonicalChatLocation(conversationId: number | null, query: LocationQuery) {
  const nextQuery: LocationQueryRaw = { ...query }

  delete nextQuery.conversationId

  return {
    path: buildChatPath(conversationId),
    query: Object.keys(nextQuery).length > 0 ? nextQuery : undefined,
  }
}

async function reloadConversationListSafely(load: () => Promise<void>) {
  try {
    await load()
  }
  catch {
    // 保留已有错误态，同时确保路由回退不会被列表刷新失败阻塞。
  }
}

export function createChatWorkspace() {
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

  const routeConversationState = computed(() => {
    const routeParams = route.params as Record<string, string | string[] | undefined>
    const id = getFirstRouteValue(routeParams.id)

    if (!id) {
      return {
        hasParam: false,
        id: null,
      }
    }

    return {
      hasParam: true,
      id: parseConversationId(id),
    }
  })

  const legacyConversationState = computed(() => {
    const id = getFirstRouteValue(route.query.conversationId as string | string[] | null | undefined)

    if (id === undefined) {
      return {
        hasQuery: false,
        id: null,
      }
    }

    return {
      hasQuery: true,
      id: parseConversationId(id),
    }
  })

  const selectedConversationId = computed<number | null>(() => {
    return routeConversationState.value.id
  })

  const isNewConversationView = computed(() => !routeConversationState.value.hasParam)
  const hasLegacyConversationIdQuery = computed(() => legacyConversationState.value.hasQuery)

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

  const modelSwitchGroups = computed<ChatModelSwitchGroup[]>(() =>
    usableConfigs.value.map(config => ({
      models: config.models.map(model => ({
        modelId: model.id,
        modelName: model.name,
        providerConfigId: config.id,
        providerName: config.displayName,
      })),
      providerConfigId: config.id,
      providerName: config.displayName,
    })),
  )

  const selectedModelName = computed(() =>
    selectedProviderConfig.value?.models
      .find(model => model.id === effectiveRuntimeConfig.value.modelId)
      ?.name ?? null,
  )

  const selectedConversationTitle = computed(() => {
    if (!routeConversationState.value.hasParam)
      return t('chat.workspace.newConversation')

    return conversationDetail.conversation.value?.title
      ?? conversationList.conversations.value.find(item => item.id === selectedConversationId.value)?.title
      ?? t('chat.workspace.activeConversation')
  })

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

  async function navigateToConversation(id: number | null, options?: { replace?: boolean }) {
    const targetPath = buildChatPath(id)

    if (route.path === targetPath && !hasLegacyConversationIdQuery.value)
      return

    const targetLocation = buildCanonicalChatLocation(id, route.query)

    if (options?.replace) {
      await router.replace(targetLocation)
      return
    }

    await router.push(targetLocation)
  }

  async function handleConversationSelection(id: number) {
    await chatStream.stopCurrentStream()

    if (selectedConversationId.value === id && routeConversationState.value.hasParam)
      return

    await navigateToConversation(id)
  }

  async function handleCreateConversation() {
    draftRuntimeConfig.value = {
      ...effectiveRuntimeConfig.value,
    }

    await chatStream.stopCurrentStream()
    await navigateToConversation(null)
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

    if (selectedConversationId.value !== id)
      return

    draftRuntimeConfig.value = {
      ...effectiveRuntimeConfig.value,
    }

    await navigateToConversation(null, {
      replace: true,
    })
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

  async function handleRuntimeChange(nextSelection: { providerConfigId: number, modelId: string }) {
    const nextConfig = usableConfigs.value.find(config => config.id === nextSelection.providerConfigId)
    const nextModel = nextConfig?.models.find(model => model.id === nextSelection.modelId) ?? null

    if (!nextConfig || !nextModel)
      return

    await persistRuntimeConfig(buildUpdatedRuntimeConfig({
      modelId: nextModel.id,
      providerConfigId: nextConfig.id,
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
      conversationDetail.replaceConversation(conversation)
      conversationId = conversation.id
      await navigateToConversation(conversation.id, {
        replace: true,
      })
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

          if (conversationDetail.conversation.value?.id === event.conversation.id) {
            conversationDetail.replaceConversation(event.conversation)
            conversationDetail.appendMessage(event.startedMessage)
          }

          return
        }

        if (event.type === 'completed') {
          conversationList.upsertConversation(event.conversation)

          if (conversationDetail.conversation.value?.id === event.conversation.id) {
            conversationDetail.replaceConversation(event.conversation)
            conversationDetail.replaceLastAssistantMessage(event.assistantMessage)
          }

          return
        }

        if (event.type === 'failed') {
          conversationList.upsertConversation(event.conversation)

          if (conversationDetail.conversation.value?.id === event.conversation.id) {
            conversationDetail.replaceConversation(event.conversation)
            conversationDetail.replaceLastAssistantMessage(event.assistantMessage)
          }
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

  watch(legacyConversationState, async (legacyState) => {
    if (!legacyState.hasQuery)
      return

    if (routeConversationState.value.hasParam) {
      await navigateToConversation(routeConversationState.value.id, {
        replace: true,
      })
      return
    }

    await navigateToConversation(legacyState.id, {
      replace: true,
    })
  }, { immediate: true })

  let selectionSyncToken = 0

  watch([() => routeConversationState.value.hasParam, selectedConversationId], async ([hasParam, conversationId], previousValue) => {
    const [previousHasParam, previousConversationId] = previousValue ?? []

    if (previousHasParam === hasParam && previousConversationId === conversationId)
      return

    const currentToken = ++selectionSyncToken

    await chatStream.stopCurrentStream()

    if (!hasParam) {
      conversationDetail.clear()
      return
    }

    if (!conversationId) {
      conversationDetail.clear()
      await reloadConversationListSafely(conversationList.load)

      if (currentToken !== selectionSyncToken)
        return

      await navigateToConversation(null, {
        replace: true,
      })
      return
    }

    if (conversationDetail.conversation.value?.id === conversationId)
      return

    conversationDetail.clear()

    try {
      await conversationDetail.load(conversationId)
    }
    catch {
      await reloadConversationListSafely(conversationList.load)

      if (currentToken !== selectionSyncToken)
        return

      await navigateToConversation(null, {
        replace: true,
      })
    }
  }, { immediate: true })

  onMounted(async () => {
    await Promise.all([
      providerSettings.load(),
      conversationList.load(),
    ])
  })

  return {
    canSend,
    composerValue,
    conversationListErrorMessage: conversationList.errorMessage,
    conversations: conversationList.conversations,
    errorMessage: chatStream.errorMessage,
    handleConversationSelection,
    handleCreateConversation,
    handleDeleteConversation,
    handleRenameConversation,
    handleRuntimeChange,
    handleSendMessage,
    handleStopMessage,
    isHistoryOpen,
    isConversationListBusy,
    isConversationListLoading: conversationList.isLoading,
    isConversationLoading: conversationDetail.isLoading,
    isNewConversationView,
    isSending: chatStream.isSending,
    messages: conversationDetail.messages,
    modelSwitchGroups,
    partialAssistantMessage: chatStream.partialAssistantMessage,
    providerLoadError: providerSettings.errorMessage,
    selectedConversationId,
    selectedConversationTitle,
    selectedModelId: computed(() => effectiveRuntimeConfig.value.modelId),
    selectedModelName,
    selectedProviderId: computed(() => effectiveRuntimeConfig.value.providerConfigId),
    selectedProviderName: computed(() => selectedProviderConfig.value?.displayName ?? null),
  }
}

export type ChatWorkspace = ReturnType<typeof createChatWorkspace>

const chatWorkspaceKey: InjectionKey<ChatWorkspace> = Symbol('chat-workspace')

export function provideChatWorkspace(workspace: ChatWorkspace) {
  provide(chatWorkspaceKey, workspace)
  return workspace
}

export function useChatWorkspace() {
  const workspace = inject(chatWorkspaceKey, null)

  if (!workspace)
    throw new Error('Chat workspace context is missing')

  return workspace
}
