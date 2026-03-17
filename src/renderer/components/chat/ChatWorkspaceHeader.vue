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
  <section class="overflow-hidden rounded-[2.4rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(248,250,252,0.82)_46%,rgba(236,253,245,0.86))] p-5 shadow-[0_20px_70px_-36px_rgba(15,23,42,0.35)] sm:p-6">
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(21rem,0.8fr)]">
      <div class="grid gap-5">
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

        <div class="grid gap-3">
          <div class="grid gap-1">
            <p class="m-0 text-[11px] font-medium uppercase tracking-[0.24em] text-toned">
              {{ t('chat.workspace.activeConversation') }}
            </p>
            <h1 class="m-0 text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-tight text-highlighted">
              {{ resolvedConversationTitle }}
            </h1>
          </div>

          <p class="m-0 max-w-[60ch] text-sm leading-7 text-toned sm:text-base">
            {{ conversationTitle ? t('chat.workspace.resumeHint') : t('chat.workspace.startHint') }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UButton
            class="rounded-full"
            color="primary"
            icon="i-lucide-pen-square"
            :disabled="isBusy"
            :label="t('chat.workspace.newConversation')"
            @click="emit('createConversation')"
          />
          <UButton
            class="rounded-full"
            color="neutral"
            icon="i-lucide-panel-right-open"
            :label="t('chat.workspace.history')"
            variant="outline"
            @click="emit('openHistory')"
          />
        </div>
      </div>

      <div class="grid gap-4 rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur sm:p-5">
        <div class="grid gap-1">
          <p class="m-0 text-[11px] font-medium uppercase tracking-[0.24em] text-toned">
            {{ t('chat.workspace.providerSection') }}
          </p>
          <p class="m-0 text-sm leading-7 text-toned">
            {{ t('chat.workspace.providerDescription') }}
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-2">
            <label class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('chat.board.provider') }}
            </label>
            <USelect
              :model-value="selectedProviderId ? String(selectedProviderId) : undefined"
              :items="providerItems"
              :placeholder="t('chat.board.noProvider')"
              @update:model-value="emit('providerChange', $event)"
            />
          </div>

          <div class="grid gap-2">
            <label class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('chat.board.model') }}
            </label>
            <USelect
              :model-value="selectedModelId ?? undefined"
              :items="modelItems"
              :placeholder="t('chat.empty.noModel')"
              @update:model-value="emit('modelChange', $event)"
            />
          </div>
        </div>

        <UAlert
          v-if="providerLoadError"
          color="warning"
          :description="providerLoadError"
          :title="t('chat.board.providerLoadError')"
          variant="soft"
        />
      </div>
    </div>
  </section>
</template>
