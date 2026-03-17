<script setup lang="ts">
import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import ChatConversationEmptyState from '#renderer/components/chat/ChatConversationEmptyState.vue'
import MessageBubble from '#renderer/components/chat/MessageBubble.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  canSend: boolean
  errorMessage: string | null
  isLoading?: boolean
  isSending?: boolean
  messages: readonly ConversationMessageRecord[]
  modelName: string | null
  partialAssistantMessage: AssistantMessage | null
  providerName: string | null
}>()

const emit = defineEmits<{
  send: []
  stop: []
}>()

const composerValue = defineModel<string>({
  default: '',
})

const { t } = useI18n()

const hasMessages = computed(() =>
  props.messages.length > 0 || Boolean(props.partialAssistantMessage),
)

function handleComposerKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && props.canSend) {
    event.preventDefault()
    emit('send')
  }
}
</script>

<template>
  <section class="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1.8rem] border border-default/70 bg-default/95 shadow-sm">
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 sm:px-6 sm:pt-6">
      <div
        v-if="isLoading && !hasMessages"
        class="grid gap-3"
      >
        <USkeleton class="h-24 rounded-[1.3rem]" />
        <USkeleton class="ml-auto h-28 max-w-[70%] rounded-[1.3rem]" />
        <USkeleton class="h-40 rounded-[1.3rem]" />
      </div>

      <ChatConversationEmptyState
        v-else-if="!hasMessages"
        :model-name="modelName"
        :provider-name="providerName"
      />

      <div
        v-else
        class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 pb-4 sm:pr-2"
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

    <UAlert
      v-if="errorMessage"
      class="mx-4 mt-4 sm:mx-6"
      color="error"
      :description="errorMessage"
      :title="t('chat.board.streamError')"
      variant="soft"
    />

    <footer class="shrink-0 border-t border-default/70 bg-elevated/60 p-4 sm:p-5">
      <UTextarea
        v-model="composerValue"
        autoresize
        class="w-full"
        :disabled="isSending"
        :maxrows="12"
        :placeholder="t('chat.composer.placeholder')"
        :rows="3"
        trailing
        :ui="{
          base: 'min-h-28 pb-12 pe-14',
          trailing: 'absolute end-3 bottom-3 inset-y-auto flex items-end',
        }"
        @keydown="handleComposerKeydown"
      >
        <template #trailing>
          <UButton
            class="rounded-full shadow-sm"
            :aria-label="isSending ? t('chat.composer.pause') : t('chat.composer.send')"
            :color="isSending ? 'warning' : 'primary'"
            :disabled="isSending ? false : !canSend"
            :icon="isSending ? 'i-lucide-square' : 'i-lucide-send-horizontal'"
            size="lg"
            square
            :title="isSending ? t('chat.composer.pause') : t('chat.composer.send')"
            @click="isSending ? emit('stop') : emit('send')"
          />
        </template>
      </UTextarea>
    </footer>
  </section>
</template>
