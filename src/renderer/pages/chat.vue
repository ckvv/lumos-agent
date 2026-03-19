<script setup lang="ts">
import type { ChatWorkspaceViewProps } from '#renderer/components/chat/types'
import AboutModal from '#renderer/components/app/AboutModal.vue'
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ChatHistorySlideover from '#renderer/components/chat/ChatHistorySlideover.vue'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import ProviderSettingsModal from '#renderer/components/providers/ProviderSettingsModal.vue'
import { createChatWorkspace } from '#renderer/composables/chat/createChatWorkspace'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

definePage({
  meta: {
    requiresAuth: true,
  },
  name: 'chat',
})

const router = useRouter()
const bootstrap = useAppBootstrap()
const { t } = useI18n()
const workspace = createChatWorkspace()
const isAboutOpen = shallowRef(false)
const isProviderSettingsOpen = shallowRef(false)
const composerValue = computed({
  get: () => workspace.composer.value.value,
  set: (value) => {
    workspace.composer.value.value = value
  },
})
const chatViewProps = computed<ChatWorkspaceViewProps>(() => ({
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
}))

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
        :conversations="workspace.sidebar.conversations.value"
        :current-username="bootstrap.currentUsername.value"
        :is-busy="workspace.sidebar.isBusy.value"
        :is-loading="workspace.sidebar.isLoading.value"
        :selected-conversation-id="workspace.sidebar.selectedConversationId.value"
        :streaming-conversation-ids="workspace.sidebar.streamingConversationIds.value"
        @create="workspace.actions.createConversation"
        @delete="workspace.actions.deleteConversation"
        @logout="handleLogout"
        @open-about="handleOpenAbout"
        @open-provider-settings="handleOpenProviderSettings"
        @rename="workspace.actions.renameConversation"
        @select="workspace.actions.selectConversation"
      />
    </template>

    <div class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-rows-[minmax(0,1fr)] lg:gap-0">
      <div class="flex items-center justify-between gap-3 lg:hidden">
        <UButton
          color="neutral"
          icon="i-lucide-panel-left"
          :label="t('chat.workspace.history')"
          variant="soft"
          @click="workspace.actions.openHistory"
        />

        <p class="m-0 truncate text-sm font-medium text-highlighted">
          {{ workspace.sidebar.selectedConversationTitle.value }}
        </p>
      </div>

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
    </div>

    <ChatHistorySlideover
      v-model:open="workspace.sidebar.isHistoryOpen.value"
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
      @open-about="handleOpenAbout"
      @open-provider-settings="handleOpenProviderSettings"
      @rename="workspace.actions.renameConversation"
      @select="workspace.actions.selectConversation"
    />

    <AboutModal v-model:open="isAboutOpen" />

    <ProviderSettingsModal v-model:open="isProviderSettingsOpen" />
  </AuthenticatedFrame>
</template>
