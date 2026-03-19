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
      :is-loading="workspace.isConversationLoading.value"
      :messages="workspace.messages.value"
      :partial-assistant-message="workspace.partialAssistantMessage.value"
    />
  </section>
</template>
