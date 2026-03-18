<script setup lang="ts">
import type {
  ChatConversationViewProps,
  ChatRuntimeChangePayload,
} from '#renderer/components/chat/view-contracts'
import ChatComposerPanel from '#renderer/components/chat/ChatComposerPanel.vue'
import MessageBubble from '#renderer/components/chat/MessageBubble.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<ChatConversationViewProps>(), {
  conversationTitle: null,
  isLoading: false,
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

const hasMessages = computed(() =>
  props.messages.length > 0 || Boolean(props.partialAssistantMessage),
)

const showLoading = computed(() =>
  props.isLoading && !hasMessages.value,
)

const showEmptyConversation = computed(() =>
  !showLoading.value && !hasMessages.value,
)

const emptyConversationTitle = computed(() =>
  props.conversationTitle ?? t('chat.workspace.emptyConversation'),
)
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.8rem] border border-default/70 bg-default/95 shadow-sm">
    <div
      v-if="showEmptyConversation"
      class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8"
    >
      <div class="grid w-full max-w-4xl gap-6">
        <h1 class="m-0 text-center text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          {{ emptyConversationTitle }}
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

    <template v-else>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 sm:px-6 sm:pt-6">
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
          class="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4 overflow-y-auto pr-1 pb-4 sm:pr-2"
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

      <footer class="shrink-0 p-4 sm:p-5">
        <div class="mx-auto w-full max-w-4xl">
          <ChatComposerPanel
            v-model="composerValue"
            :can-send="canSend"
            :error-message="errorMessage"
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
      </footer>
    </template>
  </section>
</template>
