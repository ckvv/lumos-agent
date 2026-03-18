<script setup lang="ts">
import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import ChatConversationCanvas from '#renderer/components/chat/ChatConversationCanvas.vue'
import ChatWorkspaceHeader from '#renderer/components/chat/ChatWorkspaceHeader.vue'

defineProps<{
  canSend: boolean
  conversationCount: number
  conversationTitle: string | null
  errorMessage: string | null
  isBusy?: boolean
  isLoading?: boolean
  isSending?: boolean
  messages: readonly ConversationMessageRecord[]
  modelSwitchGroups: ChatModelSwitchGroup[]
  modelName: string | null
  partialAssistantMessage: AssistantMessage | null
  providerLoadError: string | null
  providerName: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
}>()

const emit = defineEmits<{
  createConversation: []
  openHistory: []
  runtimeChange: [value: { providerConfigId: number, modelId: string }]
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
      :model-name="modelName"
      :model-switch-groups="modelSwitchGroups"
      :provider-load-error="providerLoadError"
      :provider-name="providerName"
      :selected-model-id="selectedModelId"
      :selected-provider-id="selectedProviderId"
      @create-conversation="emit('createConversation')"
      @open-history="emit('openHistory')"
      @runtime-change="emit('runtimeChange', $event)"
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
