<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
}>(), {
  orientation: 'vertical',
})

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
    class="rounded-[1.35rem] border border-default/70 bg-default/90 p-2"
    :class="props.orientation === 'vertical' ? 'grid gap-2' : 'flex flex-wrap gap-3'"
    :aria-label="t('navigation.ariaLabel')"
  >
    <UButton
      v-for="route in navRoutes"
      :key="route.key"
      class="rounded-[1rem]"
      :class="props.orientation === 'vertical' ? 'w-full justify-start px-3 py-2.5' : 'rounded-full'"
      :color="currentRoute.path === route.path ? 'primary' : 'neutral'"
      :icon="route.icon"
      :label="t(`navigation.routes.${route.key}`)"
      :to="route.path"
      :variant="currentRoute.path === route.path ? 'solid' : 'ghost'"
    />
  </nav>
</template>
