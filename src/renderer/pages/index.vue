<script setup lang="ts">
definePage({
  name: 'index',
})
</script>

<template>
  <main class="min-h-screen px-4 py-6 sm:px-6">
    <div class="mx-auto grid max-w-7xl gap-6">
      <div class="flex justify-end">
        <LocaleSwitcher />
      </div>
      <AboutView />
    </div>
  </main>
</template>
