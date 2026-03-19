<script setup lang="ts">
import type { ChatWorkspaceViewProps } from '#renderer/components/chat/types'
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import { createChatWorkspace } from '#renderer/composables/chat/createChatWorkspace'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

definePage({
  meta: {
    requiresAuth: true,
  },
  name: 'chat',
})

const router = useRouter()
const bootstrap = useAppBootstrap()
const workspace = createChatWorkspace()
const composerValue = computed({
  get: () => workspace.composer.value.value,
  set: (value) => {
    workspace.composer.value.value = value
  },
})
const chatViewProps = computed<ChatWorkspaceViewProps>(() => ({
  activeSkills: workspace.composer.activeSkills.value,
  canSend: workspace.composer.canSend.value,
  isConversationLoading: workspace.conversation.isLoading.value,
  isSending: workspace.composer.isSending.value,
  messages: workspace.conversation.messages.value,
  modelSwitchGroups: workspace.composer.modelSwitchGroups.value,
  partialAssistantMessage: workspace.conversation.partialAssistantMessage.value,
  selectedModelId: workspace.composer.selectedModelId.value,
  selectedModelName: workspace.composer.selectedModelName.value,
  selectedProviderId: workspace.composer.selectedProviderId.value,
  selectedProviderName: workspace.composer.selectedProviderName.value,
  transientToolExecutions: workspace.conversation.transientToolExecutions.value,
}))

async function handleLogout() {
  await bootstrap.logout()
  await router.replace('/auth')
}
</script>

<template>
  <AuthenticatedFrame>
    <template #sidebar>
      <ConversationSidebar
        :conversations="workspace.sidebar.conversations.value"
        :current-username="bootstrap.currentUsername.value"
        :error-message="workspace.sidebar.errorMessage.value"
        :is-busy="workspace.sidebar.isBusy.value"
        :is-loading="workspace.sidebar.isLoading.value"
        :selected-conversation-id="workspace.sidebar.selectedConversationId.value"
        :streaming-conversation-ids="workspace.sidebar.streamingConversationIds.value"
        @create="workspace.actions.createConversation"
        @delete="workspace.actions.deleteConversation"
        @logout="handleLogout"
        @rename="workspace.actions.renameConversation"
        @select="workspace.actions.selectConversation"
      />
    </template>

    <RouterView v-slot="{ Component }">
      <component
        :is="Component"
        v-model:composer-value="composerValue"
        v-bind="chatViewProps"
        @runtime-change="workspace.actions.changeRuntime"
        @send="workspace.actions.sendMessage"
        @stop="workspace.actions.stopMessage"
      />
    </RouterView>
  </AuthenticatedFrame>
</template>
