<script setup lang="ts">
import { useChatInputContext } from '#renderer/components/chat/chat-input-context'
import ChatModelSwitcher from '#renderer/components/chat/ChatModelSwitcher.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const input = useChatInputContext()

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.key !== 'Enter' || event.shiftKey)
    return

  if (!input.state.canSend.value)
    return

  event.preventDefault()
  void input.actions.handleSendMessage()
}
</script>

<template>
  <div class="chat-input-panel rounded-[1.6rem] border border-default/70 bg-default/95 shadow-sm transition-shadow focus-within:shadow-md">
    <UTextarea
      v-model="input.state.composerValue.value"
      autoresize
      class="w-full"
      color="neutral"
      :disabled="input.state.isSending.value"
      :maxrows="6"
      :placeholder="t('chat.composer.placeholder')"
      :rows="2"
      variant="none"
      :ui="{
        base: [
          'chat-input-panel__field min-h-28 resize-none px-4 pt-4 pb-3 text-base leading-7 text-highlighted sm:min-h-28 sm:px-5 sm:pt-5',
        ],
      }"
      @keydown="handleComposerKeydown"
    />

    <div class="grid grid-cols-[1fr_auto] items-end gap-3 px-3 py-3 sm:px-4">
      <ChatModelSwitcher
        class="min-w-0 max-w-full justify-self-start"
        :is-busy="input.state.isSending.value"
        :model-name="input.state.selectedModelName.value"
        :provider-name="input.state.selectedProviderName.value"
        :selected-model-id="input.state.selectedModelId.value"
        :selected-provider-id="input.state.selectedProviderId.value"
        :switch-groups="input.state.modelSwitchGroups.value"
        @change="input.actions.handleRuntimeChange"
      />

      <UButton
        class="shrink-0 rounded-full shadow-sm"
        :aria-label="input.state.isSending.value ? t('chat.composer.pause') : t('chat.composer.send')"
        :color="input.state.isSending.value ? 'warning' : 'primary'"
        :disabled="input.state.isSending.value ? false : !input.state.canSend.value"
        :icon="input.state.isSending.value ? 'i-lucide-square' : 'i-lucide-send-horizontal'"
        size="lg"
        square
        :title="input.state.isSending.value ? t('chat.composer.pause') : t('chat.composer.send')"
        @click="input.state.isSending.value ? input.actions.handleStopMessage() : input.actions.handleSendMessage()"
      />
    </div>
  </div>
</template>
