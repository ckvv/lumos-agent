<script setup lang="ts">
import { router } from '#renderer/router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

interface NavRoute {
  label: string
  name: string | symbol
  path: string
}

const { t } = useI18n()
const currentRoute = useRoute()

const navRoutes = computed<NavRoute[]>(() =>
  router
    .getRoutes()
    .filter(route => !route.redirect && route.name)
    .map(route => ({
      label: t(`navigation.routes.${String(route.name)}`),
      name: route.name!,
      path: route.path,
    })),
)
</script>

<template>
  <nav
    class="flex flex-wrap gap-3"
    :aria-label="t('navigation.ariaLabel')"
  >
    <UButton
      v-for="route in navRoutes"
      :key="route.name"
      class="rounded-full"
      color="neutral"
      :label="route.label"
      :to="route.path"
      :variant="currentRoute.path === route.path ? 'solid' : 'outline'"
    />
  </nav>
</template>
