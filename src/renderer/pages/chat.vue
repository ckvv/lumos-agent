<script setup lang="ts">
import AboutModal from '#renderer/components/app/AboutModal.vue'
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ChatHistorySlideover from '#renderer/components/chat/ChatHistorySlideover.vue'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import ProviderSettingsModal from '#renderer/components/providers/ProviderSettingsModal.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { createChatWorkspace, provideChatWorkspace } from '#renderer/composables/useChatWorkspace'
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
const workspace = provideChatWorkspace(createChatWorkspace())
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
        :streaming-conversation-id="workspace.streamingConversationId.value"
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
      <RouterView />
    </div>

    <ChatHistorySlideover
      v-model:open="workspace.isHistoryOpen.value"
      :conversations="workspace.conversations.value"
      :current-username="bootstrap.currentUsername.value"
      :error-message="workspace.conversationListErrorMessage.value"
      :is-busy="workspace.isConversationListBusy.value"
      :is-loading="workspace.isConversationListLoading.value"
      :selected-conversation-id="workspace.selectedConversationId.value"
      :streaming-conversation-id="workspace.streamingConversationId.value"
      @create="workspace.handleCreateConversation"
      @delete="workspace.handleDeleteConversation"
      @logout="handleLogout"
      @open-about="handleOpenAbout"
      @open-provider-settings="handleOpenProviderSettings"
      @rename="workspace.handleRenameConversation"
      @select="workspace.handleConversationSelection"
    />

    <AboutModal v-model:open="isAboutOpen" />

    <ProviderSettingsModal v-model:open="isProviderSettingsOpen" />
  </AuthenticatedFrame>
</template>
