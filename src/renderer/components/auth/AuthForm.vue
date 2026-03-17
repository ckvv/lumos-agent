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
  <UForm
    class="grid gap-5"
    :state="formState"
    @submit.prevent="handleSubmit"
  >
    <UFormField
      :label="t('auth.form.usernameLabel')"
      name="username"
      size="lg"
    >
      <UInput
        id="auth-username"
        v-model="formState.username"
        autocomplete="username"
        class="w-full"
        :disabled="loading"
        icon="i-lucide-user-round"
        :placeholder="t('auth.form.usernamePlaceholder')"
        size="xl"
        type="text"
      />
    </UFormField>

    <UFormField
      :label="t('auth.form.passwordLabel')"
      name="password"
      size="lg"
    >
      <UInput
        id="auth-password"
        v-model="formState.password"
        :autocomplete="mode === 'needsRegistration' ? 'new-password' : 'current-password'"
        class="w-full"
        :disabled="loading"
        icon="i-lucide-key-round"
        :placeholder="t('auth.form.passwordPlaceholder')"
        size="xl"
        type="password"
      />
    </UFormField>

    <UAlert
      v-if="errorMessage"
      color="error"
      :description="errorMessage"
      icon="i-lucide-circle-alert"
      variant="soft"
    />

    <UButton
      block
      color="neutral"
      :label="loading ? t('auth.form.submitting') : submitLabel"
      :loading="loading"
      size="xl"
      type="submit"
    />
  </UForm>
</template>
