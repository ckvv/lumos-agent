<script setup lang="ts">
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

definePage({
  name: 'about',
})

const { t } = useI18n()
const router = useRouter()
const bootstrap = useAppBootstrap()

onMounted(() => {
  void bootstrap.ensureBootstrapped()
})

async function handleBackToAuth() {
  await router.replace('/auth')
}
</script>

<template>
  <AuthenticatedFrame v-if="bootstrap.isAuthenticated.value">
    <AboutView />
  </AuthenticatedFrame>

  <main
    v-else
    class="min-h-screen px-4 py-6 sm:px-6"
  >
    <div class="mx-auto grid max-w-7xl gap-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UButton
          class="rounded-full"
          color="neutral"
          icon="i-lucide-arrow-left"
          :label="t('about.backToAuth')"
          type="button"
          variant="outline"
          @click="handleBackToAuth"
        />
        <LocaleSwitcher />
      </div>
      <AboutView />
    </div>
  </main>
</template>
