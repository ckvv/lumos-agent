<script setup lang="ts">
import type { AuthCredentialsInput } from '#shared/auth/types'
import AuthForm from '#renderer/components/auth/AuthForm.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  errorMessage: string | null
  loading: boolean
  mode: 'needsRegistration' | 'requiresLogin'
}>()

const emit = defineEmits<{
  submit: [payload: AuthCredentialsInput]
}>()

const { t } = useI18n()

const isRegistration = computed(() => props.mode === 'needsRegistration')
const eyebrow = computed(() =>
  isRegistration.value ? t('auth.register.eyebrow') : t('auth.login.eyebrow'),
)
const title = computed(() =>
  isRegistration.value ? t('auth.register.title') : t('auth.login.title'),
)
const description = computed(() =>
  isRegistration.value ? t('auth.register.description') : t('auth.login.description'),
)
</script>

<template>
  <section class="mx-auto grid w-full max-w-md gap-5 rounded-[2rem] border border-slate-300/60 bg-white/92 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
    <div class="grid gap-2">
      <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
        {{ eyebrow }}
      </p>
      <h2 class="m-0 text-[clamp(1.6rem,4vw,2.2rem)] font-bold leading-[1.05] text-slate-900">
        {{ title }}
      </h2>
      <p class="m-0 text-sm leading-[1.7] text-slate-600">
        {{ description }}
      </p>
    </div>

    <AuthForm
      :error-message="errorMessage"
      :loading="loading"
      :mode="mode"
      @submit="emit('submit', $event)"
    />
  </section>
</template>
