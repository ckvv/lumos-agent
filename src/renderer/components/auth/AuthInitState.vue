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
const stateIcon = computed(() =>
  isFailed.value ? 'i-lucide-triangle-alert' : 'i-lucide-loader-circle',
)
</script>

<template>
  <UCard
    class="mx-auto w-full max-w-xl border-accented bg-default/90 shadow-2xl backdrop-blur"
    variant="subtle"
  >
    <template #header>
      <div class="grid gap-4">
        <div class="flex items-center gap-3">
          <div
            class="flex size-12 items-center justify-center rounded-2xl"
            :class="isFailed ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'"
          >
            <UIcon
              class="size-6"
              :class="{ 'animate-spin': !isFailed }"
              :name="stateIcon"
            />
          </div>

          <UBadge
            class="w-fit"
            :color="isFailed ? 'error' : 'primary'"
            :label="t('auth.init.eyebrow')"
            variant="soft"
          />
        </div>

        <div class="grid gap-2">
          <h2 class="m-0 text-[clamp(1.7rem,4vw,2.5rem)] font-semibold tracking-tight text-highlighted">
            {{ isFailed ? t('auth.init.failedTitle') : t('auth.init.initializingTitle') }}
          </h2>
          <p class="m-0 text-base leading-7 text-toned">
            {{ isFailed ? t('auth.init.failedBody') : t('auth.init.initializingBody') }}
          </p>
        </div>
      </div>
    </template>

    <UAlert
      v-if="errorMessage"
      color="error"
      :description="errorMessage"
      icon="i-lucide-circle-alert"
      variant="subtle"
    />

    <template #footer>
      <UButton
        v-if="isFailed"
        color="neutral"
        :label="isRetrying ? t('auth.form.submitting') : t('auth.init.retry')"
        :loading="isRetrying"
        size="lg"
        type="button"
        @click="emit('retry')"
      />
    </template>
  </UCard>
</template>
