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
}>()

const composerValue = defineModel<string>({
  default: '',
})

const { t } = useI18n()

const hasMessages = computed(() =>
  props.messages.length > 0 || Boolean(props.partialAssistantMessage),
)

const runtimeSummary = computed(() =>
  [props.providerName, props.modelName].filter(Boolean).join(' · '),
)

function handleComposerKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && props.canSend) {
    event.preventDefault()
    emit('send')
  }
}
</script>

<template>
  <section class="flex min-h-[70vh] flex-1 flex-col rounded-[1.8rem] border border-default/70 bg-default/95 shadow-sm">
    <div class="flex min-h-0 flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-6">
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
        class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 sm:pr-2"
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

    <footer class="mt-4 grid gap-4 border-t border-default/70 bg-elevated/60 p-4 sm:p-5">
      <UTextarea
        v-model="composerValue"
        autoresize
        class="w-full"
        :disabled="isSending"
        :maxrows="12"
        :placeholder="t('chat.composer.placeholder')"
        :rows="3"
        @keydown="handleComposerKeydown"
      />

      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="grid gap-2">
          <p class="m-0 text-xs leading-6 text-toned">
            {{ t('chat.composer.helper') }}
          </p>
          <UBadge
            v-if="runtimeSummary"
            color="neutral"
            :label="runtimeSummary"
            variant="subtle"
          />
        </div>

        <UButton
          class="rounded-full"
          color="primary"
          icon="i-lucide-send-horizontal"
          :disabled="!canSend"
          :label="isSending ? t('chat.composer.sending') : t('chat.composer.send')"
          @click="emit('send')"
        />
      </div>
    </footer>
  </section>
</template>
