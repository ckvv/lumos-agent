<script setup lang="ts">
import type { ChatComposerRuntimeSelection, ChatWorkspaceViewProps } from '#renderer/components/chat/types'
import ChatNewConversationView from '#renderer/components/chat/ChatNewConversationView.vue'

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
  <ChatNewConversationView
    v-model:composer-value="composerValue"
    :active-skills="props.activeSkills"
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
</template>
