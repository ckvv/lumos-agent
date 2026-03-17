<script setup lang="ts">
import type { ChatRuntimeConfig } from '#shared/chat/types'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import MessageBubble from '#renderer/components/chat/MessageBubble.vue'
import { useChatStream } from '#renderer/composables/useChatStream'
import { useConversationDetail } from '#renderer/composables/useConversationDetail'
import { useConversationList } from '#renderer/composables/useConversationList'
import { useProviderSettings } from '#renderer/composables/useProviderSettings'
import { confirmAction } from '#renderer/utils/confirm'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const providerSettings = useProviderSettings()
const conversationList = useConversationList()
const conversationDetail = useConversationDetail()
const chatStream = useChatStream()

const composerValue = shallowRef('')
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

const canSend = computed(() =>
  Boolean(composerValue.value.trim())
  && !chatStream.isSending.value
  && Boolean(effectiveRuntimeConfig.value.providerConfigId)
  && Boolean(effectiveRuntimeConfig.value.modelId),
)

const hasMessages = computed(() => conversationDetail.messages.value.length > 0)

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
}

async function handleCreateConversation() {
  const conversation = await conversationList.createConversation(effectiveRuntimeConfig.value)
  conversationList.upsertConversation(conversation)
  await setSelectedConversation(conversation.id)
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
</script>

<template>
  <section class="grid h-full gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
    <ConversationSidebar
      :conversations="conversationList.conversations.value"
      :is-busy="chatStream.isSending.value || conversationList.isMutating.value"
      :selected-conversation-id="selectedConversationId"
      @create="handleCreateConversation"
      @delete="handleDeleteConversation"
      @rename="handleRenameConversation"
      @select="handleConversationSelection"
    />

    <div class="grid h-full min-h-[70vh] gap-4 rounded-[2rem] border border-default/70 bg-default/92 p-4 shadow-xl shadow-slate-200/60">
      <header class="grid gap-4 rounded-[1.5rem] border border-default/70 bg-elevated/70 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <UBadge
            color="primary"
            :label="t('chat.board.eyebrow')"
            variant="soft"
          />
          <UBadge
            color="neutral"
            :label="selectedProviderConfig?.displayName || t('chat.board.noProvider')"
            variant="soft"
          />
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <div class="grid gap-2">
            <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('chat.board.provider') }}
            </span>
            <USelect
              :model-value="effectiveRuntimeConfig.providerConfigId ? String(effectiveRuntimeConfig.providerConfigId) : undefined"
              :items="providerItems"
              @update:model-value="handleProviderChange"
            />
          </div>

          <div class="grid gap-2">
            <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('chat.board.model') }}
            </span>
            <USelect
              :model-value="effectiveRuntimeConfig.modelId ?? undefined"
              :items="modelItems"
              @update:model-value="handleModelChange"
            />
          </div>
        </div>

        <UAlert
          v-if="providerSettings.errorMessage.value"
          color="warning"
          :description="providerSettings.errorMessage.value"
          :title="t('chat.board.providerLoadError')"
          variant="soft"
        />
      </header>

      <div class="grid min-h-0 flex-1 gap-4 rounded-[1.5rem] border border-default/70 bg-white/70 p-4">
        <div
          v-if="!hasMessages && !chatStream.partialAssistantMessage.value"
          class="grid flex-1 place-items-center rounded-[1.3rem] border border-dashed border-default/70 bg-elevated/60 p-6 text-center"
        >
          <div class="grid max-w-xl gap-3">
            <h2 class="m-0 text-2xl font-semibold text-highlighted">
              {{ t('chat.empty.title') }}
            </h2>
            <p class="m-0 text-sm leading-7 text-toned">
              {{ t('chat.empty.body') }}
            </p>
          </div>
        </div>

        <div
          v-else
          class="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto pr-2"
        >
          <MessageBubble
            v-for="message in conversationDetail.messages.value"
            :key="message.id"
            :message="message.message"
          />

          <MessageBubble
            v-if="chatStream.partialAssistantMessage.value"
            :is-partial="true"
            :message="chatStream.partialAssistantMessage.value"
          />
        </div>

        <UAlert
          v-if="chatStream.errorMessage.value"
          color="error"
          :description="chatStream.errorMessage.value"
          :title="t('chat.board.streamError')"
          variant="soft"
        />

        <div class="grid gap-3 rounded-[1.5rem] border border-default/70 bg-elevated/70 p-4">
          <textarea
            v-model="composerValue"
            class="min-h-28 w-full resize-y rounded-[1.2rem] border border-default/70 bg-default px-4 py-3 text-sm leading-7 text-highlighted outline-none ring-0"
            :placeholder="t('chat.composer.placeholder')"
          />

          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="m-0 text-xs text-toned">
              {{ t('chat.composer.helper') }}
            </p>
            <UButton
              class="rounded-full"
              color="primary"
              :disabled="!canSend"
              :label="chatStream.isSending.value ? t('chat.composer.sending') : t('chat.composer.send')"
              @click="handleSendMessage"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
