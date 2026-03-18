<script setup lang="ts">
import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import ChatModelSwitcher from '#renderer/components/chat/ChatModelSwitcher.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  conversationCount: number
  conversationTitle: string | null
  isBusy?: boolean
  modelName: string | null
  modelSwitchGroups: ChatModelSwitchGroup[]
  providerLoadError: string | null
  providerName: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
}>()

const emit = defineEmits<{
  createConversation: []
  openHistory: []
  runtimeChange: [value: { providerConfigId: number, modelId: string }]
}>()

const { t } = useI18n()

const resolvedConversationTitle = computed(() =>
  props.conversationTitle || t('chat.workspace.emptyConversation'),
)

const conversationMeta = computed(() =>
  t('chat.workspace.historyCount', { count: props.conversationCount }),
)
</script>

<template>
  <section class="grid gap-3">
    <div class="flex flex-col gap-3 rounded-[1.35rem] border border-default/70 bg-default/92 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div class="flex min-w-0 items-center gap-3">
        <UButton
          class="lg:hidden"
          color="neutral"
          icon="i-lucide-panel-left-open"
          :label="t('chat.workspace.history')"
          size="sm"
          variant="ghost"
          @click="emit('openHistory')"
        />

        <div class="min-w-0 grid gap-1">
          <p class="m-0 text-[11px] font-medium uppercase tracking-[0.18em] text-toned">
            {{ t('chat.workspace.activeConversation') }}
          </p>
          <h1 class="m-0 truncate text-base font-semibold tracking-tight text-highlighted sm:text-lg">
            {{ resolvedConversationTitle }}
          </h1>
          <p class="m-0 text-xs text-toned">
            {{ conversationMeta }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ChatModelSwitcher
          class="sm:w-[20rem]"
          :is-busy="isBusy"
          :model-name="modelName"
          :provider-name="providerName"
          :selected-model-id="selectedModelId"
          :selected-provider-id="selectedProviderId"
          :switch-groups="modelSwitchGroups"
          @change="emit('runtimeChange', $event)"
        />

        <div class="flex justify-end">
          <UButton
            class="rounded-full"
            color="primary"
            icon="i-lucide-square-pen"
            :disabled="isBusy"
            :label="t('chat.workspace.newConversation')"
            size="sm"
            variant="soft"
            @click="emit('createConversation')"
          />
        </div>
      </div>
    </div>

    <UAlert
      v-if="providerLoadError"
      color="warning"
      :description="providerLoadError"
      :title="t('chat.board.providerLoadError')"
      variant="soft"
    />
  </section>
</template>
