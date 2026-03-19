<script setup lang="ts">
import type { ChatComposerRuntimeSelection, ChatWorkspaceViewProps } from '#renderer/components/chat/types'
import ChatConversationView from '#renderer/components/chat/ChatConversationView.vue'

const props = defineProps<ChatWorkspaceViewProps>()
const emit = defineEmits<{
  runtimeChange: [value: ChatComposerRuntimeSelection]
  send: []
  stop: []
}>()
const composerValue = defineModel<string>('composerValue', {
  required: true,
})
</script>

<template>
  <ChatConversationView
    v-model:composer-value="composerValue"
    :can-send="props.canSend"
    :is-loading="props.isConversationLoading"
    :is-sending="props.isSending"
    :messages="props.messages"
    :model-switch-groups="props.modelSwitchGroups"
    :partial-assistant-message="props.partialAssistantMessage"
    :selected-model-id="props.selectedModelId"
    :selected-model-name="props.selectedModelName"
    :selected-provider-id="props.selectedProviderId"
    :selected-provider-name="props.selectedProviderName"
    @runtime-change="emit('runtimeChange', $event)"
    @send="emit('send')"
    @stop="emit('stop')"
  />
</template>
