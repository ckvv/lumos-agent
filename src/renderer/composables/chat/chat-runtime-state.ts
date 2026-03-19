import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import type { createConversationDetailState } from '#renderer/composables/chat/createConversationDetailState'
import type { createConversationListState } from '#renderer/composables/chat/createConversationListState'
import type { useProviderSettings } from '#renderer/composables/useProviderSettings'
import type { ChatRuntimeConfig } from '#shared/chat/types'
import { computed, shallowRef, watch } from 'vue'

export function createChatRuntimeState(options: {
  conversationDetail: ReturnType<typeof createConversationDetailState>
  conversationList: Pick<ReturnType<typeof createConversationListState>, 'upsertConversation'>
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
