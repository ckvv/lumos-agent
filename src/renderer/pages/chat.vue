<script setup lang="ts">
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ChatHistorySlideover from '#renderer/components/chat/ChatHistorySlideover.vue'
import ChatWorkspaceView from '#renderer/components/chat/ChatWorkspaceView.vue'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { useChatWorkspace } from '#renderer/composables/useChatWorkspace'
import { useRouter } from 'vue-router'

definePage({
  meta: {
    requiresAuth: true,
  },
  name: 'chat',
})

const router = useRouter()
const bootstrap = useAppBootstrap()
const workspace = useChatWorkspace()

async function handleLogout() {
  await bootstrap.logout()
  await router.replace('/auth')
}
</script>

<template>
  <AuthenticatedFrame>
    <template #sidebar>
      <ConversationSidebar
        :conversations="workspace.conversations.value"
        :current-username="bootstrap.currentUsername.value"
        :is-busy="workspace.isConversationListBusy.value"
        :is-loading="workspace.isConversationListLoading.value"
        :selected-conversation-id="workspace.selectedConversationId.value"
        @create="workspace.handleCreateConversation"
        @delete="workspace.handleDeleteConversation"
        @logout="handleLogout"
        @rename="workspace.handleRenameConversation"
        @select="workspace.handleConversationSelection"
      />
    </template>

    <div class="h-full min-h-0">
      <ChatWorkspaceView
        v-model="workspace.composerValue.value"
        :can-send="workspace.canSend.value"
        :conversation-count="workspace.conversationCount.value"
        :conversation-title="workspace.conversationTitle.value"
        :error-message="workspace.errorMessage.value"
        :is-busy="workspace.isConversationListBusy.value"
        :is-loading="workspace.isConversationLoading.value"
        :is-sending="workspace.isSending.value"
        :messages="workspace.messages.value"
        :model-items="workspace.modelItems.value"
        :model-name="workspace.selectedModelName.value"
        :partial-assistant-message="workspace.partialAssistantMessage.value"
        :provider-items="workspace.providerItems.value"
        :provider-load-error="workspace.providerLoadError.value"
        :provider-name="workspace.selectedProviderName.value"
        :selected-model-id="workspace.selectedModelId.value"
        :selected-provider-id="workspace.selectedProviderId.value"
        @create-conversation="workspace.handleCreateConversation"
        @model-change="workspace.handleModelChange"
        @open-history="workspace.openConversationHistory"
        @provider-change="workspace.handleProviderChange"
        @send="workspace.handleSendMessage"
        @stop="workspace.handleStopMessage"
      />
    </div>

    <ChatHistorySlideover
      v-model:open="workspace.isHistoryOpen.value"
      :conversations="workspace.conversations.value"
      :current-username="bootstrap.currentUsername.value"
      :error-message="workspace.sidebarErrorMessage.value"
      :is-busy="workspace.isConversationListBusy.value"
      :is-loading="workspace.isConversationListLoading.value"
      :selected-conversation-id="workspace.selectedConversationId.value"
      @create="workspace.handleCreateConversation"
      @delete="workspace.handleDeleteConversation"
      @logout="handleLogout"
      @rename="workspace.handleRenameConversation"
      @select="workspace.handleConversationSelection"
    />
  </AuthenticatedFrame>
</template>
