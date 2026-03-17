<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const currentRoute = useRoute()

const navRoutes = [
  {
    icon: 'i-lucide-message-square',
    key: 'chat',
    path: '/chat',
  },
  {
    icon: 'i-lucide-sliders-horizontal',
    key: 'providers',
    path: '/settings/providers',
  },
  {
    icon: 'i-lucide-info',
    key: 'about',
    path: '/about',
  },
]
</script>

<template>
  <nav
    class="flex flex-wrap gap-3 rounded-[1.5rem] border border-white/70 bg-white/60 p-2 shadow-sm"
    :aria-label="t('navigation.ariaLabel')"
  >
    <UButton
      v-for="route in navRoutes"
      :key="route.key"
      class="rounded-full"
      :color="currentRoute.path === route.path ? 'primary' : 'neutral'"
      :icon="route.icon"
      :label="t(`navigation.routes.${route.key}`)"
      :to="route.path"
      :variant="currentRoute.path === route.path ? 'solid' : 'ghost'"
    />
  </nav>
</template>
