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
      <header class="grid gap-4 rounded-[2rem] border border-default/70 bg-default/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur">
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
              <p class="m-0 text-sm text-toned sm:text-base">
                {{ t('shell.description', { username: bootstrap.currentUsername.value ?? '-' }) }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
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
