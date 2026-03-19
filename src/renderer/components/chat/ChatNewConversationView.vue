<script setup lang="ts">
import type { ChatComposerRuntimeSelection, ChatComposerStateProps } from '#renderer/components/chat/types'
import ChatInputPanel from '#renderer/components/chat/ChatInputPanel.vue'
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
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.8rem] border border-default/70 bg-default/95 shadow-sm">
    <div class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
      <div class="grid w-full max-w-4xl gap-6">
        <h1 class="m-0 text-center text-4xl font-semibold tracking-tight text-highlighted">
          {{ t('chat.workspace.newConversation') }}
        </h1>

        <ChatInputPanel
          v-model:composer-value="composerValue"
          :can-send="props.canSend"
          :is-sending="props.isSending"
          :model-switch-groups="props.modelSwitchGroups"
          :selected-model-id="props.selectedModelId"
          :selected-model-name="props.selectedModelName"
          :selected-provider-id="props.selectedProviderId"
          :selected-provider-name="props.selectedProviderName"
          @runtime-change="emit('runtimeChange', $event)"
          @send="emit('send')"
          @stop="emit('stop')"
        />
      </div>
    </div>
  </section>
</template>
