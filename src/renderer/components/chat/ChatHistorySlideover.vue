<script setup lang="ts">
import type { ConversationSummary } from '#shared/chat/types'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  conversations: readonly ConversationSummary[]
  errorMessage: string | null
  isBusy?: boolean
  isLoading?: boolean
  selectedConversationId: number | null
}>()

const emit = defineEmits<{
  create: []
  delete: [conversationId: number]
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
</script>

<template>
  <USlideover
    v-model:open="open"
    class="sm:max-w-lg"
    :description="t('chat.workspace.historyDrawerDescription')"
    :title="t('chat.workspace.historyDrawerTitle')"
  >
    <template #body>
      <div class="grid gap-4">
        <UAlert
          v-if="errorMessage"
          color="warning"
          :description="errorMessage"
          :title="t('chat.workspace.historyLoadError')"
          variant="soft"
        />

        <ConversationSidebar
          :conversations="conversations"
          :is-busy="isBusy"
          :is-loading="isLoading"
          :selected-conversation-id="selectedConversationId"
          @create="handleCreate"
          @delete="emit('delete', $event)"
          @rename="emit('rename', $event)"
          @select="handleSelect"
        />
      </div>
    </template>
  </USlideover>
</template>
