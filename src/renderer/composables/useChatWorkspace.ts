import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import type { ChatRuntimeConfig } from '#shared/chat/types'
import type { ComputedRef, InjectionKey, ShallowRef } from 'vue'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { useAppToast } from '#renderer/composables/useAppToast'
import { useChatStream } from '#renderer/composables/useChatStream'
import { useConversationDetail } from '#renderer/composables/useConversationDetail'
import { useConversationList } from '#renderer/composables/useConversationList'
import { runWithORPCClient } from '#renderer/composables/useORPCRequest'
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

function createChatRouteState(route: ReturnType<typeof useRoute>, router: ReturnType<typeof useRouter>) {
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

  const selectedConversationId = computed<number | null>(() => routeConversationState.value.id)
  const isNewConversationView = computed(() => !routeConversationState.value.hasParam)
  const hasLegacyConversationIdQuery = computed(() => legacyConversationState.value.hasQuery)

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
    if (selectedConversationId.value === id && routeConversationState.value.hasParam)
      return

    await navigateToConversation(id)
  }

  return {
    handleConversationSelection,
    hasLegacyConversationIdQuery,
    isNewConversationView,
    legacyConversationState,
    navigateToConversation,
    routeConversationState,
    selectedConversationId,
  }
}

function createChatRuntimeState(options: {
  conversationDetail: ReturnType<typeof useConversationDetail>
  conversationList: ReturnType<typeof useConversationList>
  providerSettings: ReturnType<typeof useProviderSettings>
}) {
  const draftRuntimeConfig = shallowRef<ChatRuntimeConfig>({
    enabledCapabilities: [],
    modelId: null,
    providerConfigId: null,
    systemPrompt: '',
    toolPolicy: 'off',
  })

  const usableConfigs = computed(() =>
    options.providerSettings.configs.value.filter(config => config.isUsable),
  )

  const baseRuntimeConfig = computed(() =>
    options.conversationDetail.conversation.value?.runtimeConfig ?? draftRuntimeConfig.value,
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

  function buildUpdatedRuntimeConfig(partial: Partial<ChatRuntimeConfig>) {
    return {
      ...effectiveRuntimeConfig.value,
      ...partial,
    }
  }

  async function persistRuntimeConfig(nextRuntimeConfig: ChatRuntimeConfig) {
    if (!options.conversationDetail.conversation.value) {
      draftRuntimeConfig.value = nextRuntimeConfig
      return
    }

    const conversation = await options.conversationDetail.updateRuntimeConfig(
      options.conversationDetail.conversation.value.id,
      nextRuntimeConfig,
    )

    options.conversationList.upsertConversation(conversation)
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

  watch(usableConfigs, async (configs) => {
    if (configs.length === 0)
      return

    if (!draftRuntimeConfig.value.providerConfigId || !draftRuntimeConfig.value.modelId) {
      draftRuntimeConfig.value = resolveDefaultRuntimeConfig(draftRuntimeConfig.value)
    }
  }, { immediate: true })

  return {
    draftRuntimeConfig,
    effectiveRuntimeConfig,
    handleRuntimeChange,
    modelSwitchGroups,
    selectedModelId: computed(() => effectiveRuntimeConfig.value.modelId),
    selectedModelName,
    selectedProviderId: computed(() => effectiveRuntimeConfig.value.providerConfigId),
    selectedProviderName: computed(() => selectedProviderConfig.value?.displayName ?? null),
  }
}

function createChatMessagingState(options: {
  chatStream: ReturnType<typeof useChatStream>
  composerValue: ShallowRef<string>
  conversationDetail: ReturnType<typeof useConversationDetail>
  conversationList: ReturnType<typeof useConversationList>
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

function registerChatRouteSyncEffects(options: {
  conversationDetail: ReturnType<typeof useConversationDetail>
  conversationList: ReturnType<typeof useConversationList>
  legacyConversationState: ComputedRef<{ hasQuery: boolean, id: number | null }>
  navigateToConversation: (id: number | null, options?: { replace?: boolean }) => Promise<void>
  routeConversationState: ComputedRef<{ hasParam: boolean, id: number | null }>
  selectedConversationId: ComputedRef<number | null>
}) {
  watch(options.legacyConversationState, async (legacyState) => {
    if (!legacyState.hasQuery)
      return

    if (options.routeConversationState.value.hasParam) {
      await options.navigateToConversation(options.routeConversationState.value.id, {
        replace: true,
      })
      return
    }

    await options.navigateToConversation(legacyState.id, {
      replace: true,
    })
  }, { immediate: true })

  let selectionSyncToken = 0

  watch([() => options.routeConversationState.value.hasParam, options.selectedConversationId], async ([hasParam, conversationId], previousValue) => {
    const [previousHasParam, previousConversationId] = previousValue ?? []

    if (previousHasParam === hasParam && previousConversationId === conversationId)
      return

    const currentToken = ++selectionSyncToken

    if (!hasParam) {
      options.conversationDetail.clear()
      return
    }

    if (!conversationId) {
      options.conversationDetail.clear()
      await reloadConversationListSafely(options.conversationList.load)

      if (currentToken !== selectionSyncToken)
        return

      await options.navigateToConversation(null, {
        replace: true,
      })
      return
    }

    // 新建会话后首条消息会先本地注入空详情再 replace 到 /chat/:id。
    // 这里如果先 stopCurrentStream，会把刚启动的流错误中断掉。
    if (options.conversationDetail.conversation.value?.id === conversationId)
      return

    options.conversationDetail.clear()

    try {
      await options.conversationDetail.load(conversationId)
    }
    catch {
      await reloadConversationListSafely(options.conversationList.load)

      if (currentToken !== selectionSyncToken)
        return

      await options.navigateToConversation(null, {
        replace: true,
      })
    }
  }, { immediate: true })
}

export function createChatWorkspace() {
  const { t } = useI18n()
  const appToast = useAppToast()
  const route = useRoute()
  const router = useRouter()

  const providerSettings = useProviderSettings()
  const conversationList = useConversationList()
  const conversationDetail = useConversationDetail()
  const chatStream = useChatStream()

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
    canSend: messagingState.canSend,
    composerValue,
    conversationListErrorMessage: conversationList.errorMessage,
    conversations: conversationList.conversations,
    handleConversationSelection: routeState.handleConversationSelection,
    handleCreateConversation,
    handleDeleteConversation,
    handleRenameConversation,
    handleRuntimeChange: runtimeState.handleRuntimeChange,
    handleSendMessage: messagingState.handleSendMessage,
    handleStopMessage: messagingState.handleStopMessage,
    isHistoryOpen,
    isConversationListBusy,
    isConversationListLoading: conversationList.isLoading,
    isConversationLoading: conversationDetail.isLoading,
    isNewConversationView: routeState.isNewConversationView,
    isSending: messagingState.isSending,
    messages: conversationDetail.messages,
    modelSwitchGroups: runtimeState.modelSwitchGroups,
    partialAssistantMessage: messagingState.partialAssistantMessage,
    selectedConversationId: routeState.selectedConversationId,
    selectedConversationTitle,
    selectedModelId: runtimeState.selectedModelId,
    selectedModelName: runtimeState.selectedModelName,
    selectedProviderId: runtimeState.selectedProviderId,
    selectedProviderName: runtimeState.selectedProviderName,
    streamingConversationIds: chatStream.streamingConversationIds,
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
