<script setup lang="ts">
import ChatWorkspaceView from '#renderer/components/chat/ChatWorkspaceView.vue'
import { useChatWorkspace } from '#renderer/composables/useChatWorkspace'

const workspace = useChatWorkspace()
</script>

<template>
  <ChatWorkspaceView
    v-model="workspace.composerValue.value"
    :can-send="workspace.canSend.value"
    :conversation-title="workspace.selectedConversationTitle.value"
    :error-message="workspace.errorMessage.value"
    :is-loading="workspace.isConversationLoading.value"
    :is-new-conversation-view="workspace.isNewConversationView.value"
    :is-sending="workspace.isSending.value"
    :messages="workspace.messages.value"
    :model-switch-groups="workspace.modelSwitchGroups.value"
    :model-name="workspace.selectedModelName.value"
    :partial-assistant-message="workspace.partialAssistantMessage.value"
    :provider-load-error="workspace.providerLoadError.value"
    :provider-name="workspace.selectedProviderName.value"
    :selected-model-id="workspace.selectedModelId.value"
    :selected-provider-id="workspace.selectedProviderId.value"
    @open-history="workspace.isHistoryOpen.value = true"
    @runtime-change="workspace.handleRuntimeChange"
    @send="workspace.handleSendMessage"
    @stop="workspace.handleStopMessage"
  />
</template>
