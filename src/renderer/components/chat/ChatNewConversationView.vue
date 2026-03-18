<script setup lang="ts">
import type {
  ChatNewConversationViewProps,
  ChatRuntimeChangePayload,
} from '#renderer/components/chat/view-contracts'
import ChatComposerPanel from '#renderer/components/chat/ChatComposerPanel.vue'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<ChatNewConversationViewProps>(), {
  isSending: false,
})

const emit = defineEmits<{
  runtimeChange: [value: ChatRuntimeChangePayload]
  send: []
  stop: []
}>()

const composerValue = defineModel<string>({
  default: '',
})

const { t } = useI18n()
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.8rem] border border-default/70 bg-default/95 shadow-sm">
    <div class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
      <div class="grid w-full max-w-4xl gap-6">
        <h1 class="m-0 text-center text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          {{ t('chat.workspace.newConversation') }}
        </h1>

        <ChatComposerPanel
          v-model="composerValue"
          :can-send="canSend"
          :error-message="errorMessage"
          :is-centered="true"
          :is-sending="isSending"
          :model-switch-groups="modelSwitchGroups"
          :model-name="modelName"
          :provider-load-error="providerLoadError"
          :provider-name="providerName"
          :selected-model-id="selectedModelId"
          :selected-provider-id="selectedProviderId"
          @runtime-change="emit('runtimeChange', $event)"
          @send="emit('send')"
          @stop="emit('stop')"
        />
      </div>
    </div>
  </section>
</template>
