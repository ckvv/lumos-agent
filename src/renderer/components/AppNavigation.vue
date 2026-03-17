<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const currentRoute = useRoute()

const navRoutes = [
  {
    key: 'chat',
    path: '/chat',
  },
  {
    key: 'providers',
    path: '/settings/providers',
  },
  {
    key: 'about',
    path: '/',
  },
]
</script>

<template>
  <nav
    class="flex flex-wrap gap-3"
    :aria-label="t('navigation.ariaLabel')"
  >
    <UButton
      v-for="route in navRoutes"
      :key="route.key"
      class="rounded-full"
      color="neutral"
      :label="t(`navigation.routes.${route.key}`)"
      :to="route.path"
      :variant="currentRoute.path === route.path ? 'solid' : 'outline'"
    />
  </nav>
</template>
