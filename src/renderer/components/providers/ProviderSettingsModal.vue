<script setup lang="ts">
import AppModalShell from '#renderer/components/app/AppModalShell.vue'
import ProviderSettingsView from '#renderer/components/providers/ProviderSettingsView.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const open = defineModel<boolean>('open', {
  default: false,
})
</script>

<template>
  <AppModalShell
    v-model:open="open"
    :title="t('navigation.routes.providers')"
  >
    <ProviderSettingsView v-if="open" />
  </AppModalShell>
</template>
