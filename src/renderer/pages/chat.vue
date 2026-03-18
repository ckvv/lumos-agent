<script setup lang="ts">
import AboutModal from '#renderer/components/app/AboutModal.vue'
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ChatWorkspaceView from '#renderer/components/chat/ChatWorkspaceView.vue'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import ProviderSettingsModal from '#renderer/components/providers/ProviderSettingsModal.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { useChatWorkspace } from '#renderer/composables/useChatWorkspace'
import { shallowRef } from 'vue'
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
const isAboutOpen = shallowRef(false)
const isProviderSettingsOpen = shallowRef(false)

async function handleLogout() {
  await bootstrap.logout()
  await router.replace('/auth')
}

function handleOpenAbout() {
  isAboutOpen.value = true
}

function handleOpenProviderSettings() {
  isProviderSettingsOpen.value = true
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
        @open-about="handleOpenAbout"
        @open-provider-settings="handleOpenProviderSettings"
        @rename="workspace.handleRenameConversation"
        @select="workspace.handleConversationSelection"
      />
    </template>

    <div class="h-full min-h-0">
      <ChatWorkspaceView
        v-model="workspace.composerValue.value"
        :can-send="workspace.canSend.value"
        :error-message="workspace.errorMessage.value"
        :is-busy="workspace.isConversationListBusy.value"
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
    </div>
    <AboutModal v-model:open="isAboutOpen" />

    <ProviderSettingsModal v-model:open="isProviderSettingsOpen" />
  </AuthenticatedFrame>
</template>
