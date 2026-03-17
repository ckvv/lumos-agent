<script setup lang="ts">
import AuthGate from '#renderer/components/auth/AuthGate.vue'
import AuthInitState from '#renderer/components/auth/AuthInitState.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

definePage({
  name: 'auth',
})

const { t } = useI18n()
const router = useRouter()
const bootstrap = useAppBootstrap()

onMounted(() => {
  void bootstrap.ensureBootstrapped()
})

async function handleAuthSubmit(payload: { password: string, username: string }) {
  if (bootstrap.authState.value === 'needsRegistration') {
    await bootstrap.register(payload)
  }
  else {
    await bootstrap.login(payload)
  }

  await router.replace(bootstrap.recommendedRoute.value)
}
</script>

<template>
  <main class="min-h-screen px-4 py-6 sm:px-6">
    <div class="mx-auto grid max-w-7xl gap-6">
      <div class="flex justify-end">
        <LocaleSwitcher />
      </div>

      <section
        v-if="bootstrap.viewState.value === 'initializing' || bootstrap.viewState.value === 'failed'"
        class="mx-auto mt-8 flex max-w-5xl justify-center"
      >
        <AuthInitState
          :error-message="bootstrap.initializationErrorMessage.value"
          :is-retrying="bootstrap.isBootstrapping.value"
          :status="bootstrap.bootstrapState.value?.database.status ?? 'initializing'"
          @retry="bootstrap.retryBootstrap"
        />
      </section>

      <section
        v-else
        class="grid gap-6 rounded-[2.4rem] border border-default/70 bg-default/92 p-6 shadow-2xl shadow-slate-200/65 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,28rem)] lg:p-8"
      >
        <div class="grid content-start gap-5">
          <div class="flex flex-wrap gap-2">
            <UBadge
              color="primary"
              :label="t('auth.shell.eyebrow')"
              variant="soft"
            />
            <UBadge
              color="neutral"
              :label="t('auth.shell.aboutLink')"
              variant="soft"
            />
          </div>

          <div class="grid gap-3">
            <h1 class="m-0 max-w-4xl text-[clamp(2.2rem,6vw,4.6rem)] font-semibold leading-none tracking-tight text-highlighted">
              {{ t('auth.shell.title') }}
            </h1>
            <p class="m-0 max-w-[58ch] text-base leading-8 text-toned">
              {{ t('auth.shell.description') }}
            </p>
          </div>

          <div class="grid gap-4 rounded-[1.8rem] border border-default/70 bg-elevated/70 p-5">
            <h2 class="m-0 text-lg font-semibold text-highlighted">
              {{ t('auth.shell.featuresTitle') }}
            </h2>
            <ul class="m-0 grid gap-3 pl-5 text-sm leading-7 text-toned marker:text-primary">
              <li>{{ t('auth.shell.features.providers') }}</li>
              <li>{{ t('auth.shell.features.workspace') }}</li>
              <li>{{ t('auth.shell.features.persistence') }}</li>
            </ul>
            <UButton
              class="w-fit rounded-full"
              color="neutral"
              :label="t('auth.shell.viewAbout')"
              to="/"
              variant="outline"
            />
          </div>
        </div>

        <AuthGate
          :error-message="bootstrap.actionErrorMessage.value"
          :loading="bootstrap.isSubmitting.value"
          :mode="bootstrap.authState.value === 'needsRegistration' ? 'needsRegistration' : 'requiresLogin'"
          @submit="handleAuthSubmit"
        />
      </section>
    </div>
  </main>
</template>
