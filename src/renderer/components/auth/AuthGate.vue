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
  <UCard
    class="mx-auto w-full max-w-md border-accented bg-default/85 shadow-2xl backdrop-blur"
    variant="subtle"
  >
    <template #header>
      <div class="grid gap-3">
        <UBadge
          class="w-fit"
          color="primary"
          :label="eyebrow"
          variant="soft"
        />
        <div class="grid gap-2">
          <h2 class="m-0 text-[clamp(1.6rem,4vw,2.4rem)] font-semibold tracking-tight text-highlighted">
            {{ title }}
          </h2>
          <p class="m-0 text-sm leading-7 text-toned">
            {{ description }}
          </p>
        </div>
      </div>
    </template>

    <AuthForm
      :error-message="errorMessage"
      :loading="loading"
      :mode="mode"
      @submit="emit('submit', $event)"
    />
  </UCard>
</template>
