<script setup lang="ts">
import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import ChatConversationCanvas from '#renderer/components/chat/ChatConversationCanvas.vue'
import ChatWorkspaceHeader from '#renderer/components/chat/ChatWorkspaceHeader.vue'

interface SelectItem {
  label: string
  value: string
}

defineProps<{
  canSend: boolean
  conversationCount: number
  conversationTitle: string | null
  errorMessage: string | null
  isBusy?: boolean
  isLoading?: boolean
  isSending?: boolean
  messages: readonly ConversationMessageRecord[]
  modelItems: SelectItem[]
  modelName: string | null
  partialAssistantMessage: AssistantMessage | null
  providerItems: SelectItem[]
  providerLoadError: string | null
  providerName: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
}>()

const emit = defineEmits<{
  createConversation: []
  modelChange: [value: string | number]
  openHistory: []
  providerChange: [value: string | number]
  send: []
  stop: []
}>()

const composerValue = defineModel<string>({
  default: '',
})
</script>

<template>
  <section class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden">
    <ChatWorkspaceHeader
      :conversation-count="conversationCount"
      :conversation-title="conversationTitle"
      :is-busy="isBusy"
      :model-items="modelItems"
      :provider-items="providerItems"
      :provider-load-error="providerLoadError"
      :selected-model-id="selectedModelId"
      :selected-provider-id="selectedProviderId"
      @create-conversation="emit('createConversation')"
      @model-change="emit('modelChange', $event)"
      @open-history="emit('openHistory')"
      @provider-change="emit('providerChange', $event)"
    />

    <ChatConversationCanvas
      v-model="composerValue"
      :can-send="canSend"
      :error-message="errorMessage"
      :is-loading="isLoading"
      :is-sending="isSending"
      :messages="messages"
      :model-name="modelName"
      :partial-assistant-message="partialAssistantMessage"
      :provider-name="providerName"
      @send="emit('send')"
      @stop="emit('stop')"
    />
  </section>
</template>
