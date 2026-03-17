<script setup lang="ts">
import AuthGate from '#renderer/components/auth/AuthGate.vue'
import AuthInitState from '#renderer/components/auth/AuthInitState.vue'
import { useAuth } from '#renderer/composables/useAuth'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const auth = useAuth()

onMounted(() => {
  void auth.ensureBootstrapped()
})

async function handleAuthSubmit(payload: { password: string, username: string }) {
  if (auth.viewState.value === 'needsRegistration') {
    await auth.register(payload)
    return
  }

  await auth.login(payload)
}

async function handleLogout() {
  await auth.logout()
}
</script>

<template>
  <main class="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
    <div class="mx-auto flex max-w-6xl justify-end">
      <LocaleSwitcher />
    </div>

    <section
      v-if="auth.viewState.value === 'initializing' || auth.viewState.value === 'failed'"
      class="mx-auto mt-8 flex max-w-6xl justify-center"
    >
      <AuthInitState
        :error-message="auth.initializationErrorMessage.value"
        :is-retrying="auth.isBootstrapping.value"
        :status="auth.bootstrapState.value?.databaseInitStatus ?? 'initializing'"
        @retry="auth.retryBootstrap"
      />
    </section>

    <section
      v-else-if="auth.viewState.value !== 'authenticated'"
      class="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,30rem)] lg:items-center"
    >
      <div class="grid gap-4">
        <UBadge
          class="w-fit"
          color="primary"
          :label="t('auth.shell.eyebrow')"
          variant="soft"
        />
        <h1 class="m-0 max-w-4xl text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-none tracking-tight text-highlighted">
          {{ t('auth.shell.title') }}
        </h1>
        <p class="m-0 max-w-[58ch] text-base leading-8 text-toned">
          {{ t('auth.shell.description') }}
        </p>
      </div>

      <AuthGate
        :error-message="auth.actionErrorMessage.value"
        :loading="auth.isSubmitting.value"
        :mode="auth.viewState.value"
        @submit="handleAuthSubmit"
      />
    </section>

    <template v-else>
      <header class="mx-auto mb-6 mt-6 grid max-w-6xl gap-5">
        <UCard
          class="border-accented bg-default/90 shadow-lg"
          variant="subtle"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="grid gap-2">
              <UBadge
                class="w-fit"
                color="primary"
                :label="t('shell.eyebrow')"
                variant="soft"
              />
              <p class="m-0 text-sm text-toned">
                {{ t('shell.currentUser', { username: auth.currentUsername.value ?? '-' }) }}
              </p>
            </div>

            <UButton
              class="rounded-full"
              color="neutral"
              :label="t('shell.logout')"
              size="lg"
              type="button"
              variant="outline"
              @click="handleLogout"
            />
          </div>
        </UCard>

        <div class="grid gap-2">
          <h1 class="m-0 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-tight tracking-tight text-highlighted">
            {{ t('shell.title') }}
          </h1>
          <p class="m-0 max-w-[58ch] text-base leading-8 text-toned">
            {{ t('shell.description') }}
          </p>
        </div>
        <AppNavigation />
      </header>

      <section class="mx-auto max-w-6xl">
        <RouterView />
      </section>
    </template>
  </main>
</template>
