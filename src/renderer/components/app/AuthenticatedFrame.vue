<script setup lang="ts">
import AuthenticatedUserMenu from '#renderer/components/app/AuthenticatedUserMenu.vue'
import AuthInitState from '#renderer/components/auth/AuthInitState.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { computed, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const bootstrap = useAppBootstrap()
const slots = useSlots()

const hasSidebar = computed(() => Boolean(slots.sidebar))

async function handleLogout() {
  await bootstrap.logout()
  await router.replace('/auth')
}
</script>

<template>
  <main class="h-screen overflow-hidden bg-transparent">
    <div class="grid h-full min-h-0 overflow-hidden p-3 sm:p-4 lg:p-6">
      <AuthInitState
        v-if="bootstrap.viewState.value === 'initializing' || bootstrap.viewState.value === 'failed'"
        :error-message="bootstrap.initializationErrorMessage.value"
        :is-retrying="bootstrap.isBootstrapping.value"
        :status="bootstrap.bootstrapState.value?.database.status ?? 'initializing'"
        @retry="bootstrap.retryBootstrap"
      />

      <div
        v-else
        class="grid h-full min-h-0 gap-4 overflow-hidden"
        :class="hasSidebar ? 'lg:grid-cols-[18.5rem_minmax(0,1fr)]' : 'grid-rows-[auto_minmax(0,1fr)]'"
      >
        <template v-if="hasSidebar">
          <aside class="hidden min-h-0 overflow-hidden lg:block">
            <div class="h-full min-h-0 overflow-hidden">
              <slot name="sidebar" />
            </div>
          </aside>

          <section class="grid h-full min-h-0 overflow-hidden">
            <slot />
          </section>
        </template>

        <template v-else>
          <header class="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-default/70 bg-default/92 px-4 py-3 shadow-sm">
            <div class="grid gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  color="primary"
                  :label="t('shell.eyebrow')"
                  variant="soft"
                />
                <UBadge
                  v-if="Boolean(bootstrap.bootstrapState.value?.providerSummary.usesPlaintextFallback)"
                  color="warning"
                  :label="t('shell.securityWarning')"
                  variant="soft"
                />
              </div>

              <p class="m-0 text-sm leading-6 text-toned">
                {{ t('shell.description', { username: bootstrap.currentUsername.value ?? '-' }) }}
              </p>
            </div>

            <div class="w-full sm:w-auto sm:min-w-72">
              <AuthenticatedUserMenu
                :current-username="bootstrap.currentUsername.value"
                side="bottom"
                @logout="handleLogout"
              />
            </div>
          </header>

          <section class="grid h-full min-h-0 overflow-hidden">
            <slot />
          </section>
        </template>
      </div>
    </div>
  </main>
</template>
