<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface SelectItem {
  label: string
  value: string
}

const props = defineProps<{
  conversationCount: number
  conversationTitle: string | null
  isBusy?: boolean
  modelItems: SelectItem[]
  providerItems: SelectItem[]
  providerLoadError: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
}>()

const emit = defineEmits<{
  createConversation: []
  openHistory: []
  providerChange: [value: string | number]
  modelChange: [value: string | number]
}>()

const { t } = useI18n()

const resolvedConversationTitle = computed(() =>
  props.conversationTitle || t('chat.workspace.emptyConversation'),
)
</script>

<template>
  <section class="grid gap-3">
    <div class="flex flex-col gap-4 rounded-[1.6rem] border border-default/70 bg-default/92 p-4 shadow-sm sm:p-5 xl:flex-row xl:items-center xl:justify-between">
      <div class="flex items-start gap-3">
        <UButton
          class="lg:hidden"
          color="neutral"
          icon="i-lucide-panel-left-open"
          :label="t('chat.workspace.history')"
          size="sm"
          variant="ghost"
          @click="emit('openHistory')"
        />

        <div class="grid gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              color="primary"
              :label="t('chat.workspace.focusLabel')"
              variant="soft"
            />
            <UBadge
              color="neutral"
              :label="t('chat.workspace.historyCount', { count: conversationCount })"
              variant="subtle"
            />
          </div>

          <div class="grid gap-1">
            <p class="m-0 text-[11px] font-medium uppercase tracking-[0.22em] text-toned">
              {{ t('chat.workspace.activeConversation') }}
            </p>
            <h1 class="m-0 text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
              {{ resolvedConversationTitle }}
            </h1>
            <p class="m-0 text-sm leading-6 text-toned">
              {{ conversationTitle ? t('chat.workspace.resumeHint') : t('chat.workspace.startHint') }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 xl:min-w-[29rem]">
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end xl:justify-end">
          <div class="grid gap-2 sm:min-w-40 sm:flex-1">
            <label class="text-[11px] font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('chat.board.provider') }}
            </label>
            <USelect
              :disabled="isBusy"
              :model-value="selectedProviderId ? String(selectedProviderId) : undefined"
              :items="providerItems"
              :placeholder="t('chat.board.noProvider')"
              @update:model-value="emit('providerChange', $event)"
            />
          </div>

          <div class="grid gap-2 sm:min-w-40 sm:flex-1">
            <label class="text-[11px] font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('chat.board.model') }}
            </label>
            <USelect
              :disabled="isBusy"
              :model-value="selectedModelId ?? undefined"
              :items="modelItems"
              :placeholder="t('chat.empty.noModel')"
              @update:model-value="emit('modelChange', $event)"
            />
          </div>

          <UButton
            class="rounded-full sm:self-end"
            color="primary"
            icon="i-lucide-square-pen"
            :disabled="isBusy"
            :label="t('chat.workspace.newConversation')"
            @click="emit('createConversation')"
          />
        </div>
      </div>
    </div>

    <UAlert
      v-if="providerLoadError"
      color="warning"
      :description="providerLoadError"
      :title="t('chat.board.providerLoadError')"
      variant="soft"
    />
  </section>
</template>
