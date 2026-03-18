<script setup lang="ts">
import AboutView from '#renderer/components/AboutView.vue'
import AppModalShell from '#renderer/components/app/AppModalShell.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const open = defineModel<boolean>('open', {
  default: false,
})
</script>

<template>
  <AppModalShell
    v-model:open="open"
    :title="t('navigation.routes.about')"
  >
    <AboutView />
  </AppModalShell>
</template>
