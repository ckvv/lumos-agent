<script setup lang="ts">
import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import ChatConversationCanvas from '#renderer/components/chat/ChatConversationCanvas.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  canSend: boolean
  conversationTitle: string
  errorMessage: string | null
  isLoading?: boolean
  isNewConversationView: boolean
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
  openHistory: []
  runtimeChange: [value: { providerConfigId: number, modelId: string }]
  send: []
  stop: []
}>()

const composerValue = defineModel<string>({
  default: '',
})

const { t } = useI18n()
</script>

<template>
  <section class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
    <div class="flex items-center justify-between gap-3 lg:hidden">
      <UButton
        color="neutral"
        icon="i-lucide-panel-left"
        :label="t('chat.workspace.history')"
        variant="soft"
        @click="emit('openHistory')"
      />

      <p class="m-0 truncate text-sm font-medium text-highlighted">
        {{ conversationTitle }}
      </p>
    </div>

    <ChatConversationCanvas
      v-model="composerValue"
      :can-send="canSend"
      :conversation-title="conversationTitle"
      :error-message="errorMessage"
      :is-loading="isLoading"
      :is-new-conversation-view="isNewConversationView"
      :is-sending="isSending"
      :messages="messages"
      :model-switch-groups="modelSwitchGroups"
      :model-name="modelName"
      :partial-assistant-message="partialAssistantMessage"
      :provider-load-error="providerLoadError"
      :provider-name="providerName"
      :selected-model-id="selectedModelId"
      :selected-provider-id="selectedProviderId"
      @runtime-change="emit('runtimeChange', $event)"
      @send="emit('send')"
      @stop="emit('stop')"
    />
  </section>
</template>
