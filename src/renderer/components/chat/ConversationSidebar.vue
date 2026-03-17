<script setup lang="ts">
import type { ConversationSummary } from '#shared/chat/types'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  conversations: readonly ConversationSummary[]
  isBusy?: boolean
  isLoading?: boolean
  selectedConversationId: number | null
}>()

const emit = defineEmits<{
  create: []
  delete: [conversationId: number]
  rename: [payload: { id: number, title: string }]
  select: [conversationId: number]
}>()

const { t } = useI18n()

const editingConversationId = shallowRef<number | null>(null)
const editingTitle = shallowRef('')
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
})

const hasConversations = computed(() => props.conversations.length > 0)

function startRenaming(conversation: ConversationSummary) {
  editingConversationId.value = conversation.id
  editingTitle.value = conversation.title
}

function stopRenaming() {
  editingConversationId.value = null
  editingTitle.value = ''
}

function submitRename(id: number) {
  const title = editingTitle.value.trim()

  if (!title)
    return

  emit('rename', {
    id,
    title,
  })
  stopRenaming()
}

function formatConversationTime(value: string | null) {
  if (!value)
    return t('chat.sidebar.noMessages')

  return timeFormatter.format(new Date(value))
}
</script>

<template>
  <section class="grid h-full min-h-0 gap-4 rounded-[1.7rem] border border-default/70 bg-default/92 p-4 shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <div class="grid gap-1">
        <h2 class="m-0 text-base font-semibold text-highlighted">
          {{ t('chat.sidebar.title') }}
        </h2>
        <p class="m-0 text-xs text-toned">
          {{ t('chat.sidebar.description') }}
        </p>
      </div>

      <UButton
        class="rounded-full"
        color="primary"
        :disabled="isBusy"
        :label="t('chat.sidebar.newConversation')"
        size="sm"
        @click="emit('create')"
      />
    </div>

    <div
      v-if="isLoading && !hasConversations"
      class="grid gap-3"
    >
      <USkeleton
        v-for="index in 4"
        :key="index"
        class="h-20 rounded-[1.2rem]"
      />
    </div>

    <div
      v-else-if="!hasConversations"
      class="rounded-[1.3rem] border border-dashed border-default/70 bg-elevated/60 p-4 text-sm leading-7 text-toned"
    >
      {{ t('chat.sidebar.empty') }}
    </div>

    <div
      v-else
      class="grid min-h-0 gap-2 overflow-y-auto pr-1"
    >
      <article
        v-for="conversation in conversations"
        :key="conversation.id"
        class="grid gap-3 rounded-[1.25rem] border p-3 transition-colors hover:border-default hover:bg-elevated/90"
        :class="conversation.id === selectedConversationId
          ? 'border-primary/25 bg-primary/6'
          : 'border-default/70 bg-elevated/45'"
      >
        <template v-if="editingConversationId === conversation.id">
          <UInput
            v-model="editingTitle"
            autofocus
            @keyup.enter="submitRename(conversation.id)"
          />
          <div class="flex items-center justify-end gap-2">
            <UButton
              color="neutral"
              :label="t('chat.sidebar.cancelRename')"
              size="xs"
              variant="outline"
              @click="stopRenaming"
            />
            <UButton
              color="primary"
              :disabled="!editingTitle.trim()"
              :label="t('chat.sidebar.saveRename')"
              size="xs"
              @click="submitRename(conversation.id)"
            />
          </div>
        </template>

        <template v-else>
          <button
            class="grid gap-1 text-left"
            type="button"
            @click="emit('select', conversation.id)"
          >
            <span class="truncate text-sm font-medium text-highlighted">
              {{ conversation.title }}
            </span>
            <span class="line-clamp-2 text-xs leading-6 text-toned">
              {{ conversation.lastMessagePreview || t('chat.sidebar.noPreview') }}
            </span>
          </button>

          <div class="flex items-center justify-between gap-3">
            <span class="text-[11px] uppercase tracking-[0.18em] text-toned">
              {{ formatConversationTime(conversation.lastMessageAt) }}
            </span>
            <div class="flex items-center gap-2">
              <UButton
                color="neutral"
                :disabled="isBusy"
                icon="i-lucide-pencil-line"
                size="xs"
                variant="ghost"
                @click="startRenaming(conversation)"
              />
              <UButton
                color="error"
                :disabled="isBusy"
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                @click="emit('delete', conversation.id)"
              />
            </div>
          </div>
        </template>
      </article>
    </div>
  </section>
</template>
