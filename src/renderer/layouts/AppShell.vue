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
  <main class="min-h-screen bg-[linear-gradient(180deg,#f6fffb_0%,#f5f7fb_38%,#eef2ff_100%)] px-4 py-8 sm:px-6 sm:py-12">
    <div class="mx-auto flex max-w-5xl justify-end">
      <LocaleSwitcher />
    </div>

    <section
      v-if="auth.viewState.value === 'initializing' || auth.viewState.value === 'failed'"
      class="mx-auto mt-8 flex max-w-5xl justify-center"
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
      class="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,28rem)] lg:items-center"
    >
      <div class="grid gap-4">
        <p class="m-0 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
          {{ t('auth.shell.eyebrow') }}
        </p>
        <h1 class="m-0 text-[clamp(2.2rem,6vw,4.4rem)] font-bold leading-[0.95] text-slate-900">
          {{ t('auth.shell.title') }}
        </h1>
        <p class="m-0 max-w-[54ch] text-base leading-[1.8] text-slate-600">
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
      <header class="mx-auto mb-6 mt-6 grid max-w-5xl gap-5">
        <div class="flex flex-col gap-4 rounded-[2rem] border border-slate-300/40 bg-white/86 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div class="grid gap-1">
            <span class="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              {{ t('shell.eyebrow') }}
            </span>
            <p class="m-0 text-sm text-slate-600">
              {{ t('shell.currentUser', { username: auth.currentUsername.value ?? '-' }) }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              class="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              type="button"
              @click="handleLogout"
            >
              {{ t('shell.logout') }}
            </button>
          </div>
        </div>

        <div class="grid gap-2">
          <h1 class="m-0 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] text-slate-900">
            {{ t('shell.title') }}
          </h1>
          <p class="m-0 max-w-[56ch] text-base text-slate-600">
            {{ t('shell.description') }}
          </p>
        </div>
        <AppNavigation />
      </header>

      <section class="mx-auto max-w-5xl">
        <RouterView />
      </section>
    </template>
  </main>
</template>
