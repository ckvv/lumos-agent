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
  <section class="grid min-h-[72vh] gap-4 rounded-[2.4rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(239,246,255,0.52)_42%,rgba(255,251,235,0.55))] p-4 shadow-[0_20px_70px_-36px_rgba(15,23,42,0.3)] sm:p-5">
    <div class="grid min-h-0 flex-1 gap-4 rounded-[2rem] border border-white/80 bg-white/78 p-4 shadow-sm backdrop-blur sm:p-5">
      <div
        v-if="isLoading && !hasMessages"
        class="grid gap-3"
      >
        <USkeleton class="h-28 rounded-[1.6rem]" />
        <USkeleton class="ml-auto h-32 max-w-[70%] rounded-[1.6rem]" />
        <USkeleton class="h-44 rounded-[1.6rem]" />
      </div>

      <ChatConversationEmptyState
        v-else-if="!hasMessages"
        :model-name="modelName"
        :provider-name="providerName"
      />

      <div
        v-else
        class="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto pr-2"
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

      <UAlert
        v-if="errorMessage"
        color="error"
        :description="errorMessage"
        :title="t('chat.board.streamError')"
        variant="soft"
      />

      <footer class="grid gap-4 rounded-[1.8rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-sm">
        <UTextarea
          v-model="composerValue"
          autoresize
          class="w-full"
          :disabled="isSending"
          :maxrows="12"
          :placeholder="t('chat.composer.placeholder')"
          :rows="4"
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
    </div>
  </section>
</template>
