import type { createConversationDetailState } from '#renderer/composables/chat/createConversationDetailState'
import type { createConversationListState } from '#renderer/composables/chat/createConversationListState'
import type { ComputedRef } from 'vue'
import type { LocationQuery, LocationQueryRaw, useRoute, useRouter } from 'vue-router'
import { computed, watch } from 'vue'

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

export function createChatRouteState(route: ReturnType<typeof useRoute>, router: ReturnType<typeof useRouter>) {
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

export function registerChatRouteSyncEffects(options: {
  conversationDetail: ReturnType<typeof createConversationDetailState>
  conversationList: Pick<ReturnType<typeof createConversationListState>, 'load'>
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
    // 这里如果先 clear/stop，会把刚启动的流错误中断掉。
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
