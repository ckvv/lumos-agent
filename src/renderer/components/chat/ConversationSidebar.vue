<script setup lang="ts">
import type { ConversationSummary } from '#shared/chat/types'
import type { DropdownMenuItem } from '@nuxt/ui'
import AuthenticatedUserMenu from '#renderer/components/app/AuthenticatedUserMenu.vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  conversations: readonly ConversationSummary[]
  currentUsername: string | null
  isBusy?: boolean
  isLoading?: boolean
  selectedConversationId: number | null
  streamingConversationIds?: readonly number[]
}>()

const emit = defineEmits<{
  create: []
  delete: [conversationId: number]
  logout: []
  openAbout: []
  openProviderSettings: []
  rename: [payload: { id: number, title: string }]
  select: [conversationId: number]
}>()

const { t } = useI18n()

const editingConversationId = shallowRef<number | null>(null)
const editingTitle = shallowRef('')

const hasConversations = computed(() => props.conversations.length > 0)
const streamingConversationIdSet = computed(() => new Set(props.streamingConversationIds ?? []))

function isSelectedConversation(conversationId: number) {
  return conversationId === props.selectedConversationId
}

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

function selectConversation(conversationId: number) {
  emit('select', conversationId)
}

function deleteConversation(conversationId: number) {
  emit('delete', conversationId)
}

function isConversationStreaming(conversationId: number) {
  return streamingConversationIdSet.value.has(conversationId)
}

function getConversationMenuItems(conversation: ConversationSummary): DropdownMenuItem[][] {
  const actionsDisabled = Boolean(props.isBusy || isConversationStreaming(conversation.id))

  return [[
    {
      disabled: actionsDisabled,
      icon: 'i-lucide-pencil-line',
      label: t('chat.sidebar.rename'),
      onSelect: () => startRenaming(conversation),
    },
    {
      color: 'error',
      disabled: actionsDisabled,
      icon: 'i-lucide-trash-2',
      label: t('chat.sidebar.delete'),
      onSelect: () => deleteConversation(conversation.id),
    },
  ]]
}
</script>

<template>
  <section class="flex h-full min-h-0 flex-col gap-4 rounded-[1.7rem] border border-default/70 bg-default/92 p-4 shadow-sm">
    <div class="grid gap-3">
      <UButton
        class="w-full justify-center rounded-[1rem]"
        color="primary"
        :disabled="isBusy"
        icon="i-lucide-square-pen"
        :label="t('chat.sidebar.newConversation')"
        size="xl"
        @click="emit('create')"
      />
    </div>
    <div class="grid gap-1">
      <h2 class="m-0 text-base font-semibold text-highlighted">
        {{ t('chat.sidebar.title') }}
      </h2>
    </div>
    <div class="flex min-h-0 flex-1 flex-col gap-4">
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
          class="group flex shrink-0 items-center gap-2 rounded-[1rem] border px-3 py-2 transition-colors"
          :class="isSelectedConversation(conversation.id)
            ? 'border-primary/25 bg-primary/6 hover:border-primary/35 hover:bg-primary/8'
            : 'border-default/70 bg-elevated/45 hover:border-default hover:bg-elevated/90'"
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
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              type="button"
              @click="selectConversation(conversation.id)"
            >
              <span class="flex size-4 shrink-0 items-center justify-center">
                <UIcon
                  v-if="isConversationStreaming(conversation.id)"
                  class="animate-spin text-primary"
                  name="i-lucide-loader-circle"
                />
              </span>

              <span class="block truncate text-sm font-medium text-highlighted">
                {{ conversation.title }}
              </span>
            </button>

            <UDropdownMenu
              :content="{
                align: 'end',
                collisionPadding: 16,
                sideOffset: 8,
              }"
              :items="getConversationMenuItems(conversation)"
              :ui="{ content: 'w-36' }"
            >
              <UButton
                class="transition-opacity opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100"
                :aria-label="t('chat.sidebar.toggleActions')"
                color="neutral"
                icon="i-lucide-ellipsis"
                size="xs"
                variant="ghost"
              />
            </UDropdownMenu>
          </template>
        </article>
      </div>

      <div class="mt-auto border-t border-default/70 pt-4">
        <AuthenticatedUserMenu
          :current-username="currentUsername"
          @logout="emit('logout')"
          @open-about="emit('openAbout')"
          @open-provider-settings="emit('openProviderSettings')"
        />
      </div>
    </div>
  </section>
</template>
