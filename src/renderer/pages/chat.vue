<script setup lang="ts">
import type { ChatWorkspaceViewProps } from '#renderer/components/chat/types'
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ConversationSidebar from '#renderer/components/chat/ConversationSidebar.vue'
import { createChatWorkspace } from '#renderer/composables/chat/createChatWorkspace'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { computed, watch } from 'vue'
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
const breakpoints = useBreakpoints(breakpointsTailwind)
const workspace = createChatWorkspace()
const isDesktop = breakpoints.greaterOrEqual('lg')
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
  workspace.actions.closeHistory()
  await bootstrap.logout()
  await router.replace('/auth')
}

async function handleCreateConversation() {
  workspace.actions.closeHistory()
  await workspace.actions.createConversation()
}

function handleSelectConversation(conversationId: number) {
  workspace.actions.closeHistory()
  workspace.actions.selectConversation(conversationId)
}

// 切回桌面布局时主动收起移动端侧边栏，避免再次缩小时残留打开状态。
watch(isDesktop, (value) => {
  if (value)
    workspace.actions.closeHistory()
})
</script>

<template>
  <AuthenticatedFrame>
    <template #sidebar>
      <ConversationSidebar
        v-if="isDesktop"
        :conversations="workspace.sidebar.conversations.value"
        :current-username="bootstrap.currentUsername.value"
        :error-message="workspace.sidebar.errorMessage.value"
        :is-busy="workspace.sidebar.isBusy.value"
        :is-loading="workspace.sidebar.isLoading.value"
        :selected-conversation-id="workspace.sidebar.selectedConversationId.value"
        :streaming-conversation-ids="workspace.sidebar.streamingConversationIds.value"
        @create="handleCreateConversation"
        @delete="workspace.actions.deleteConversation"
        @logout="handleLogout"
        @rename="workspace.actions.renameConversation"
        @select="handleSelectConversation"
      />
    </template>

    <div class="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden lg:grid-rows-[minmax(0,1fr)] lg:gap-0">
      <div class="flex items-center justify-between gap-3 lg:hidden">
        <UButton
          :aria-pressed="workspace.sidebar.isHistoryOpen.value"
          color="neutral"
          icon="i-lucide-panel-left"
          :label="t('chat.workspace.history')"
          variant="soft"
          @click="workspace.actions.toggleHistory"
        />

        <p class="m-0 truncate text-sm font-medium text-highlighted">
          {{ workspace.sidebar.selectedConversationTitle.value }}
        </p>
      </div>

      <div class="relative min-h-0">
        <div
          v-if="!isDesktop"
          class="pointer-events-none absolute inset-0 z-20 lg:hidden"
        >
          <button
            :aria-hidden="!workspace.sidebar.isHistoryOpen.value"
            :aria-label="t('chat.workspace.history')"
            class="absolute inset-0 bg-black/20 transition-opacity duration-200"
            :class="workspace.sidebar.isHistoryOpen.value ? 'pointer-events-auto opacity-100' : 'opacity-0'"
            :tabindex="workspace.sidebar.isHistoryOpen.value ? 0 : -1"
            type="button"
            @click="workspace.actions.closeHistory"
          />

          <div
            :aria-hidden="!workspace.sidebar.isHistoryOpen.value"
            class="absolute inset-y-0 left-0 w-[min(22rem,calc(100vw-1.5rem))] max-w-full p-1 transition-transform duration-200 ease-out"
            :class="workspace.sidebar.isHistoryOpen.value ? 'translate-x-0 pointer-events-auto' : '-translate-x-full'"
            :inert="!workspace.sidebar.isHistoryOpen.value"
          >
            <ConversationSidebar
              :conversations="workspace.sidebar.conversations.value"
              :current-username="bootstrap.currentUsername.value"
              :error-message="workspace.sidebar.errorMessage.value"
              :is-busy="workspace.sidebar.isBusy.value"
              :is-loading="workspace.sidebar.isLoading.value"
              :selected-conversation-id="workspace.sidebar.selectedConversationId.value"
              :streaming-conversation-ids="workspace.sidebar.streamingConversationIds.value"
              @create="handleCreateConversation"
              @delete="workspace.actions.deleteConversation"
              @logout="handleLogout"
              @rename="workspace.actions.renameConversation"
              @select="handleSelectConversation"
            />
          </div>
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
    </div>
  </AuthenticatedFrame>
</template>
