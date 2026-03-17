<script setup lang="ts">
import AuthInitState from '#renderer/components/auth/AuthInitState.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const bootstrap = useAppBootstrap()

async function handleLogout() {
  await bootstrap.logout()
  await router.replace('/auth')
}
</script>

<template>
  <main class="min-h-screen px-4 py-6 sm:px-6">
    <div class="mx-auto grid max-w-7xl gap-6">
      <header class="overflow-hidden rounded-[2.2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.86)_42%,rgba(239,246,255,0.8))] p-5 shadow-[0_22px_80px_-38px_rgba(15,23,42,0.34)] backdrop-blur sm:p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="grid gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <UBadge
                color="primary"
                :label="t('shell.eyebrow')"
                variant="soft"
              />
              <UBadge
                v-if="bootstrap.bootstrapState.value?.providerSummary.usesPlaintextFallback"
                color="warning"
                :label="t('shell.securityWarning')"
                variant="soft"
              />
            </div>
            <div class="grid gap-1">
              <h1 class="m-0 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
                {{ t('shell.title') }}
              </h1>
              <p class="m-0 max-w-[62ch] text-sm leading-7 text-toned sm:text-base">
                {{ t('shell.description', { username: bootstrap.currentUsername.value ?? '-' }) }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 rounded-full border border-white/70 bg-white/70 px-3 py-2 shadow-sm">
            <LocaleSwitcher />
            <UButton
              class="rounded-full"
              color="neutral"
              :label="t('shell.logout')"
              type="button"
              variant="outline"
              @click="handleLogout"
            />
          </div>
        </div>

        <AppNavigation />
      </header>

      <AuthInitState
        v-if="bootstrap.viewState.value === 'initializing' || bootstrap.viewState.value === 'failed'"
        :error-message="bootstrap.initializationErrorMessage.value"
        :is-retrying="bootstrap.isBootstrapping.value"
        :status="bootstrap.bootstrapState.value?.database.status ?? 'initializing'"
        @retry="bootstrap.retryBootstrap"
      />

      <section
        v-else
        class="min-h-[calc(100vh-14rem)]"
      >
        <slot />
      </section>
    </div>
  </main>
</template>
