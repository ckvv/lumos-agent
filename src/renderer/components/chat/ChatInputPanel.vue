<script setup lang="ts">
import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import ChatModelSwitcher from '#renderer/components/chat/ChatModelSwitcher.vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  canSend: boolean
  isCentered?: boolean
  isSending?: boolean
  modelSwitchGroups: ChatModelSwitchGroup[]
  modelName: string | null
  providerName: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
}>(), {
  isCentered: false,
  isSending: false,
})

const emit = defineEmits<{
  runtimeChange: [value: { providerConfigId: number, modelId: string }]
  send: []
  stop: []
}>()

const composerValue = defineModel<string>({
  default: '',
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
  <div class="rounded-[1.6rem] border border-default/70 bg-default/95 shadow-sm transition-shadow focus-within:shadow-md">
    <UTextarea
      v-model="composerValue"
      autoresize
      class="w-full"
      color="neutral"
      :disabled="isSending"
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
        :is-busy="isSending"
        :model-name="modelName"
        :provider-name="providerName"
        :selected-model-id="selectedModelId"
        :selected-provider-id="selectedProviderId"
        :switch-groups="modelSwitchGroups"
        @change="emit('runtimeChange', $event)"
      />

      <UButton
        class="shrink-0 rounded-full shadow-sm"
        :aria-label="isSending ? t('chat.composer.pause') : t('chat.composer.send')"
        :color="isSending ? 'warning' : 'primary'"
        :disabled="isSending ? false : !canSend"
        :icon="isSending ? 'i-lucide-square' : 'i-lucide-send-horizontal'"
        size="lg"
        square
        :title="isSending ? t('chat.composer.pause') : t('chat.composer.send')"
        @click="isSending ? emit('stop') : emit('send')"
      />
    </div>
  </div>
</template>
