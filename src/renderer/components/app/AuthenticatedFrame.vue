<script setup lang="ts">
import AuthenticatedFrameSidebar from '#renderer/components/app/AuthenticatedFrameSidebar.vue'
import AuthInitState from '#renderer/components/auth/AuthInitState.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { computed, shallowRef, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const bootstrap = useAppBootstrap()
const slots = useSlots()

const isNavigationOpen = shallowRef(false)
const hasSidebar = computed(() => Boolean(slots.sidebar))

watch(() => route.fullPath, () => {
  isNavigationOpen.value = false
})

async function handleLogout() {
  await bootstrap.logout()
  await router.replace('/auth')
}
</script>

<template>
  <main class="min-h-screen bg-transparent">
    <div class="grid min-h-screen lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside class="hidden border-r border-default/70 bg-default/55 p-4 lg:block">
        <AuthenticatedFrameSidebar
          :current-username="bootstrap.currentUsername.value"
          :show-security-warning="Boolean(bootstrap.bootstrapState.value?.providerSummary.usesPlaintextFallback)"
          @logout="handleLogout"
        />
      </aside>

      <section class="grid min-h-screen min-w-0 grid-rows-[auto_minmax(0,1fr)]">
        <header class="flex items-center justify-between gap-3 border-b border-default/70 bg-default/70 px-4 py-3 backdrop-blur lg:hidden">
          <UButton
            color="neutral"
            icon="i-lucide-panel-left"
            :label="t('shell.openNavigation')"
            variant="ghost"
            @click="isNavigationOpen = true"
          />

          <div class="text-right">
            <p class="m-0 text-[11px] font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('shell.eyebrow') }}
            </p>
            <p class="m-0 text-sm font-medium text-highlighted">
              {{ bootstrap.currentUsername.value ?? '-' }}
            </p>
          </div>
        </header>

        <div class="grid min-h-0 p-3 sm:p-4 lg:p-6">
          <AuthInitState
            v-if="bootstrap.viewState.value === 'initializing' || bootstrap.viewState.value === 'failed'"
            :error-message="bootstrap.initializationErrorMessage.value"
            :is-retrying="bootstrap.isBootstrapping.value"
            :status="bootstrap.bootstrapState.value?.database.status ?? 'initializing'"
            @retry="bootstrap.retryBootstrap"
          />

          <div
            v-else
            class="grid min-h-0 gap-4"
            :class="hasSidebar ? 'lg:grid-cols-[18.5rem_minmax(0,1fr)]' : ''"
          >
            <aside
              v-if="hasSidebar"
              class="hidden min-h-0 lg:block"
            >
              <div class="h-full min-h-0">
                <slot name="sidebar" />
              </div>
            </aside>

            <section class="grid min-h-0">
              <slot />
            </section>
          </div>
        </div>
      </section>
    </div>

    <USlideover
      v-model:open="isNavigationOpen"
      side="left"
      :title="t('shell.title')"
    >
      <template #body>
        <AuthenticatedFrameSidebar
          :current-username="bootstrap.currentUsername.value"
          :show-security-warning="Boolean(bootstrap.bootstrapState.value?.providerSummary.usesPlaintextFallback)"
          @logout="handleLogout"
        />
      </template>
    </USlideover>
  </main>
</template>
