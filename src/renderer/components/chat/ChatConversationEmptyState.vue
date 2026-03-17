<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelName: string | null
  providerName: string | null
}>()

const { t } = useI18n()

const summaryItems = computed(() => [
  {
    label: t('chat.empty.currentProvider'),
    value: props.providerName ?? t('chat.board.noProvider'),
  },
  {
    label: t('chat.empty.currentModel'),
    value: props.modelName ?? t('chat.empty.noModel'),
  },
  {
    label: t('chat.empty.history'),
    value: t('chat.empty.historyHint'),
  },
])
</script>

<template>
  <section class="grid flex-1 place-items-center rounded-[2rem] border border-dashed border-default/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.82))] p-6 text-left">
    <div class="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <div class="grid content-center gap-4">
        <UBadge
          class="w-fit"
          color="primary"
          :label="t('chat.workspace.focusLabel')"
          variant="soft"
        />
        <div class="grid gap-3">
          <h2 class="m-0 text-3xl font-semibold tracking-tight text-highlighted">
            {{ t('chat.empty.title') }}
          </h2>
          <p class="m-0 max-w-[54ch] text-sm leading-7 text-toned sm:text-base">
            {{ t('chat.empty.body') }}
          </p>
        </div>
      </div>

      <div class="grid gap-3">
        <article
          v-for="item in summaryItems"
          :key="item.label"
          class="grid gap-2 rounded-[1.5rem] border border-white/70 bg-white/80 p-4 shadow-sm"
        >
          <p class="m-0 text-[11px] font-medium uppercase tracking-[0.2em] text-toned">
            {{ item.label }}
          </p>
          <p class="m-0 text-sm leading-7 text-highlighted">
            {{ item.value }}
          </p>
        </article>
      </div>
    </div>
  </section>
</template>
