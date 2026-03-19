<script setup lang="ts">
import { useChatInputContext } from '#renderer/components/chat/chat-input-context'
import ChatModelSwitcher from '#renderer/components/chat/ChatModelSwitcher.vue'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{
  isCentered?: boolean
}>(), {
  isCentered: false,
})

const { t } = useI18n()
const input = useChatInputContext()

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.key !== 'Enter' || event.shiftKey)
    return

  if (!input.canSend.value)
    return

  event.preventDefault()
  void input.handleSendMessage()
}
</script>

<template>
  <div class="rounded-[1.6rem] border border-default/70 bg-default/95 shadow-sm transition-shadow focus-within:shadow-md">
    <UTextarea
      v-model="input.composerValue.value"
      autoresize
      class="w-full"
      color="neutral"
      :disabled="input.isSending.value"
      :maxrows="isCentered ? 16 : 12"
      :placeholder="t('chat.composer.placeholder')"
      :rows="isCentered ? 5 : 3"
      variant="none"
      :ui="{
        base: [
          'min-h-28 resize-none px-4 pt-4 pb-3 text-base leading-7 text-highlighted',
          isCentered ? 'sm:min-h-36 sm:px-5 sm:pt-5' : 'sm:min-h-28 sm:px-5 sm:pt-5',
        ],
      }"
      @keydown="handleComposerKeydown"
    />

    <div class="grid grid-cols-[1fr_auto] items-end gap-3 px-3 py-3 sm:px-4">
      <ChatModelSwitcher
        class="min-w-0 max-w-full justify-self-start"
        :is-busy="input.isSending.value"
        :model-name="input.selectedModelName.value"
        :provider-name="input.selectedProviderName.value"
        :selected-model-id="input.selectedModelId.value"
        :selected-provider-id="input.selectedProviderId.value"
        :switch-groups="input.modelSwitchGroups.value"
        @change="input.handleRuntimeChange"
      />

      <UButton
        class="shrink-0 rounded-full shadow-sm"
        :aria-label="input.isSending.value ? t('chat.composer.pause') : t('chat.composer.send')"
        :color="input.isSending.value ? 'warning' : 'primary'"
        :disabled="input.isSending.value ? false : !input.canSend.value"
        :icon="input.isSending.value ? 'i-lucide-square' : 'i-lucide-send-horizontal'"
        size="lg"
        square
        :title="input.isSending.value ? t('chat.composer.pause') : t('chat.composer.send')"
        @click="input.isSending.value ? input.handleStopMessage() : input.handleSendMessage()"
      />
    </div>
  </div>
</template>
