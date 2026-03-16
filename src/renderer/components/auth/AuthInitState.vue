<script setup lang="ts">
import type { DatabaseInitStatus } from '#shared/auth/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  errorMessage: string | null
  isRetrying: boolean
  status: DatabaseInitStatus
}>()

const emit = defineEmits<{
  retry: []
}>()

const { t } = useI18n()
const isFailed = computed(() => props.status === 'failed')
</script>

<template>
  <section class="mx-auto grid w-full max-w-xl gap-5 rounded-[2rem] border border-slate-300/60 bg-white/92 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
    <div class="grid gap-3">
      <div
        class="flex h-14 w-14 items-center justify-center rounded-2xl"
        :class="isFailed ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'"
      >
        <div
          v-if="!isFailed"
          class="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
        <span
          v-else
          class="text-2xl font-bold"
        >
          !
        </span>
      </div>

      <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
        {{ t('auth.init.eyebrow') }}
      </p>
      <h2 class="m-0 text-[clamp(1.7rem,4vw,2.4rem)] font-bold leading-[1.05] text-slate-900">
        {{ isFailed ? t('auth.init.failedTitle') : t('auth.init.initializingTitle') }}
      </h2>
      <p class="m-0 text-base leading-[1.7] text-slate-600">
        {{ isFailed ? t('auth.init.failedBody') : t('auth.init.initializingBody') }}
      </p>
    </div>

    <p
      v-if="errorMessage"
      class="m-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-[1.6] text-rose-700"
    >
      {{ errorMessage }}
    </p>

    <button
      v-if="isFailed"
      class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      :disabled="isRetrying"
      type="button"
      @click="emit('retry')"
    >
      {{ isRetrying ? t('auth.form.submitting') : t('auth.init.retry') }}
    </button>
  </section>
</template>
