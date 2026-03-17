<script setup lang="ts">
definePage({
  name: 'index',
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6">
    <UPageCard
      class="w-full max-w-lg rounded-[2rem]"
      title="Redirecting..."
      description="正在根据当前登录状态进入应用。"
    />
  </main>
</template>
