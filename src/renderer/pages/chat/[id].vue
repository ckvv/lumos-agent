<script setup lang="ts">
import ChatConversationView from '#renderer/components/chat/ChatConversationView.vue'
import { useChatWorkspace } from '#renderer/composables/useChatWorkspace'
import { useI18n } from 'vue-i18n'

const workspace = useChatWorkspace()
const { t } = useI18n()
</script>

<template>
  <section class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-rows-[minmax(0,1fr)] lg:gap-0">
    <div class="flex items-center justify-between gap-3 lg:hidden">
      <UButton
        color="neutral"
        icon="i-lucide-panel-left"
        :label="t('chat.workspace.history')"
        variant="soft"
        @click="workspace.isHistoryOpen.value = true"
      />

      <p class="m-0 truncate text-sm font-medium text-highlighted">
        {{ workspace.selectedConversationTitle.value }}
      </p>
    </div>

    <ChatConversationView
      v-model="workspace.composerValue.value"
      :can-send="workspace.canSend.value"
      :conversation-title="workspace.selectedConversationTitle.value"
      :error-message="workspace.selectedConversationErrorMessage.value"
      :is-loading="workspace.isConversationLoading.value"
      :is-sending="workspace.isSending.value"
      :messages="workspace.messages.value"
      :model-switch-groups="workspace.modelSwitchGroups.value"
      :model-name="workspace.selectedModelName.value"
      :partial-assistant-message="workspace.partialAssistantMessage.value"
      :provider-load-error="workspace.providerLoadError.value"
      :provider-name="workspace.selectedProviderName.value"
      :selected-model-id="workspace.selectedModelId.value"
      :selected-provider-id="workspace.selectedProviderId.value"
      @runtime-change="workspace.handleRuntimeChange"
      @send="workspace.handleSendMessage"
      @stop="workspace.handleStopMessage"
    />
  </section>
</template>
