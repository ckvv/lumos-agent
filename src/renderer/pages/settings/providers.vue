<script setup lang="ts">
import AuthenticatedFrame from '#renderer/components/app/AuthenticatedFrame.vue'
import ProviderSettingsView from '#renderer/components/providers/ProviderSettingsView.vue'

definePage({
  meta: {
    requiresAuth: true,
  },
  name: 'provider-settings',
})
</script>

<template>
  <AuthenticatedFrame>
    <ProviderSettingsView />
  </AuthenticatedFrame>
</template>
