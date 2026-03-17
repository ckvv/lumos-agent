<script setup lang="ts">
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { onMounted } from 'vue'

definePage({
  name: 'about',
})

const bootstrap = useAppBootstrap()

onMounted(() => {
  void bootstrap.ensureBootstrapped()
})
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
      <div class="flex justify-end">
        <LocaleSwitcher />
      </div>
      <AboutView />
    </div>
  </main>
</template>
