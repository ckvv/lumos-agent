<script setup lang="ts">
defineProps<{
  title: string
}>()

defineSlots<{
  default?: () => unknown
}>()

const open = defineModel<boolean>('open', {
  default: false,
})
</script>

<template>
  <UModal
    v-model:open="open"
    class="sm:max-w-6xl"
    close-icon="i-lucide-x"
    :close="{ class: 'rounded-full' }"
    :title="title"
  >
    <template #body>
      <slot />
    </template>
  </UModal>
</template>
