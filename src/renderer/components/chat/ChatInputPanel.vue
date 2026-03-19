<script setup lang="ts">
import type { ChatComposerRuntimeSelection, ChatComposerStateProps } from '#renderer/components/chat/types'
import ChatModelSwitcher from '#renderer/components/chat/ChatModelSwitcher.vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<ChatComposerStateProps>()
const emit = defineEmits<{
  runtimeChange: [value: ChatComposerRuntimeSelection]
  send: []
  stop: []
}>()
const composerValue = defineModel<string>('composerValue', {
  required: true,
})
const { t } = useI18n()

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.key !== 'Enter' || event.shiftKey)
    return

  if (!props.canSend)
    return

  event.preventDefault()
  emit('send')
}
</script>

<template>
  <div class="chat-input-panel rounded-[1.6rem] border border-default/70 bg-default/95 shadow-sm transition-shadow focus-within:shadow-md">
    <UTextarea
      v-model="composerValue"
      autoresize
      class="w-full"
      color="neutral"
      :disabled="props.isSending"
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
        :is-busy="props.isSending"
        :model-name="props.selectedModelName"
        :provider-name="props.selectedProviderName"
        :selected-model-id="props.selectedModelId"
        :selected-provider-id="props.selectedProviderId"
        :switch-groups="props.modelSwitchGroups"
        @change="emit('runtimeChange', $event)"
      />

      <UButton
        class="shrink-0 rounded-full shadow-sm"
        :aria-label="props.isSending ? t('chat.composer.pause') : t('chat.composer.send')"
        :color="props.isSending ? 'warning' : 'primary'"
        :disabled="props.isSending ? false : !props.canSend"
        :icon="props.isSending ? 'i-lucide-square' : 'i-lucide-send-horizontal'"
        size="lg"
        square
        :title="props.isSending ? t('chat.composer.pause') : t('chat.composer.send')"
        @click="props.isSending ? emit('stop') : emit('send')"
      />
    </div>
  </div>
</template>
