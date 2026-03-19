<script setup lang="ts">
import type { ChatComposerRuntimeSelection, ChatComposerStateProps } from '#renderer/components/chat/types'
import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import ChatInputPanel from '#renderer/components/chat/ChatInputPanel.vue'
import { useChatAutoScroll } from '#renderer/components/chat/composables/useChatAutoScroll'
import MessageBubble from '#renderer/components/chat/MessageBubble.vue'
import { computed } from 'vue'

interface ChatConversationViewProps extends ChatComposerStateProps {
  isLoading?: boolean
  messages?: readonly ConversationMessageRecord[]
  partialAssistantMessage?: AssistantMessage | null
}

const props = withDefaults(defineProps<ChatConversationViewProps>(), {
  isLoading: false,
  messages: () => [],
  partialAssistantMessage: null,
})
const emit = defineEmits<{
  runtimeChange: [value: ChatComposerRuntimeSelection]
  send: []
  stop: []
}>()
const composerValue = defineModel<string>('composerValue', {
  required: true,
})
const { handleMessageListScroll, messageListElement } = useChatAutoScroll({
  messages: () => props.messages,
  partialAssistantMessage: () => props.partialAssistantMessage ?? null,
})

const hasMessages = computed(() =>
  props.messages.length > 0 || Boolean(props.partialAssistantMessage),
)

const showLoading = computed(() =>
  props.isLoading && !hasMessages.value,
)
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.8rem] border border-default/70 bg-default/95 shadow-sm">
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6">
      <div
        v-if="showLoading"
        class="mx-auto grid w-full max-w-4xl gap-3"
      >
        <USkeleton class="h-24 rounded-[1.3rem]" />
        <USkeleton class="ml-auto h-28 max-w-[70%] rounded-[1.3rem]" />
        <USkeleton class="h-40 rounded-[1.3rem]" />
      </div>

      <div
        v-else
        ref="messageListElement"
        class="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 overflow-y-auto pr-2 pb-4"
        @scroll="handleMessageListScroll"
      >
        <MessageBubble
          v-for="message in messages"
          :key="message.id"
          :message="message.message"
        />

        <MessageBubble
          v-if="partialAssistantMessage"
          :is-partial="true"
          :message="partialAssistantMessage"
        />
      </div>
    </div>

    <footer class="shrink-0 p-5">
      <div class="mx-auto w-full max-w-4xl">
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
    </footer>
  </section>
</template>
