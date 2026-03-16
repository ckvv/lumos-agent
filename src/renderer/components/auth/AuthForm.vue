<script setup lang="ts">
import type { AuthCredentialsInput } from '#shared/auth/types'
import { computed, reactive, watch } from 'vue'
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

const formState = reactive<AuthCredentialsInput>({
  password: '',
  username: '',
})

const submitLabel = computed(() =>
  props.mode === 'needsRegistration'
    ? t('auth.register.submit')
    : t('auth.login.submit'),
)

function handleSubmit() {
  emit('submit', {
    password: formState.password,
    username: formState.username,
  })
  formState.password = ''
}

watch(() => props.mode, () => {
  formState.password = ''
  formState.username = ''
})
</script>

<template>
  <form
    class="grid gap-4"
    @submit.prevent="handleSubmit"
  >
    <div class="grid gap-1.5">
      <label
        class="text-sm font-semibold text-slate-800"
        for="auth-username"
      >
        {{ t('auth.form.usernameLabel') }}
      </label>
      <input
        id="auth-username"
        v-model="formState.username"
        autocomplete="username"
        class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
        :disabled="loading"
        :placeholder="t('auth.form.usernamePlaceholder')"
        type="text"
      >
    </div>

    <div class="grid gap-1.5">
      <label
        class="text-sm font-semibold text-slate-800"
        for="auth-password"
      >
        {{ t('auth.form.passwordLabel') }}
      </label>
      <input
        id="auth-password"
        v-model="formState.password"
        :autocomplete="mode === 'needsRegistration' ? 'new-password' : 'current-password'"
        class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
        :disabled="loading"
        :placeholder="t('auth.form.passwordPlaceholder')"
        type="password"
      >
    </div>

    <p
      v-if="errorMessage"
      class="m-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      {{ errorMessage }}
    </p>

    <button
      class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      :disabled="loading"
      type="submit"
    >
      {{ loading ? t('auth.form.submitting') : submitLabel }}
    </button>
  </form>
</template>
