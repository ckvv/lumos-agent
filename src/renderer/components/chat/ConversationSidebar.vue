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
</script>

<template>
  <section class="flex h-full min-h-0 flex-col gap-4 rounded-[1.7rem] border border-default/70 bg-default/92 p-4 shadow-sm">
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
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
    >
      <article
        v-for="conversation in conversations"
        :key="conversation.id"
        class="group flex shrink-0 items-center gap-2 rounded-[1rem] border px-3 py-2 transition-colors hover:border-default hover:bg-elevated/90"
        :class="conversation.id === selectedConversationId
          ? 'border-primary/25 bg-primary/6'
          : 'border-default/70 bg-elevated/45'"
      >
        <template v-if="editingConversationId === conversation.id">
          <UInput
            v-model="editingTitle"
            class="min-w-0 flex-1"
            autofocus
            @keyup.enter="submitRename(conversation.id)"
          />
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
        </template>

        <template v-else>
          <button
            class="min-w-0 flex-1 text-left"
            type="button"
            @click="emit('select', conversation.id)"
          >
            <span class="block truncate text-sm font-medium text-highlighted">
              {{ conversation.title }}
            </span>
          </button>

          <div
            class="flex shrink-0 items-center gap-1 transition-opacity"
            :class="conversation.id === selectedConversationId
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'"
          >
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
        </template>
      </article>
    </div>
  </section>
</template>
