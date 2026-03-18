<script setup lang="ts">
import type { ConversationSummary } from '#shared/chat/types'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  conversations: readonly ConversationSummary[]
  currentUsername: string | null
  errorMessage: string | null
  isBusy?: boolean
  isLoading?: boolean
  selectedConversationId: number | null
  streamingConversationId?: number | null
}>()

const emit = defineEmits<{
  create: []
  delete: [conversationId: number]
  logout: []
  openAbout: []
  openProviderSettings: []
  rename: [payload: { id: number, title: string }]
  select: [conversationId: number]
}>()

const open = defineModel<boolean>('open', {
  default: false,
})

const { t } = useI18n()

function handleCreate() {
  emit('create')
  open.value = false
}

function handleSelect(conversationId: number) {
  emit('select', conversationId)
  open.value = false
}

function handleOpenAbout() {
  emit('openAbout')
  open.value = false
}

function handleOpenProviderSettings() {
  emit('openProviderSettings')
  open.value = false
}
</script>

<template>
  <USlideover
    v-model:open="open"
    class="sm:max-w-lg"
    :description="t('chat.workspace.historyDrawerDescription')"
    :title="t('chat.workspace.historyDrawerTitle')"
  >
    <template #body>
      <div class="flex h-full min-h-0 flex-col gap-4">
        <UAlert
          v-if="errorMessage"
          color="warning"
          :description="errorMessage"
          :title="t('chat.workspace.historyLoadError')"
          variant="soft"
        />

        <div class="min-h-0 flex-1">
          <ConversationSidebar
            :conversations="conversations"
            :current-username="currentUsername"
            :is-busy="isBusy"
            :is-loading="isLoading"
            :selected-conversation-id="selectedConversationId"
            :streaming-conversation-id="streamingConversationId"
            @create="handleCreate"
            @delete="emit('delete', $event)"
            @logout="emit('logout')"
            @open-about="handleOpenAbout"
            @open-provider-settings="handleOpenProviderSettings"
            @rename="emit('rename', $event)"
            @select="handleSelect"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
