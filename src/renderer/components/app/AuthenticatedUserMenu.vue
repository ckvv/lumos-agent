<script setup lang="ts">
import type { AppLocale } from '#renderer/composables/useLocale'
import { useLocale } from '#renderer/composables/useLocale'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  currentUsername: string | null
}>()

const emit = defineEmits<{
  logout: []
}>()

const { t } = useI18n()
const { locale, localeOptions } = useLocale()

const username = computed(() => props.currentUsername ?? '-')

function handleLocaleChange(nextLocale: AppLocale) {
  locale.value = nextLocale
}

const localeMenuItems = computed(() =>
  localeOptions.map(option => ({
    icon: locale.value === option.value ? 'i-lucide-check' : undefined,
    label: t(option.labelKey),
    onSelect: () => handleLocaleChange(option.value),
  })),
)

const menuItems = computed(() => [
  [
    {
      icon: 'i-lucide-circle-user-round',
      label: username.value,
      type: 'label' as const,
    },
  ],
  [
    {
      icon: 'i-lucide-sliders-horizontal',
      label: t('navigation.routes.providers'),
      to: '/settings/providers',
    },
    {
      icon: 'i-lucide-info',
      label: t('navigation.routes.about'),
      to: '/about',
    },
  ],
  [
    {
      children: localeMenuItems.value,
      icon: 'i-lucide-languages',
      label: t('shell.languageSwitch'),
    },
  ],
  [
    {
      color: 'error' as const,
      icon: 'i-lucide-log-out',
      label: t('shell.logout'),
      onSelect: () => emit('logout'),
    },
  ],
])
</script>

<template>
  <UDropdownMenu
    :content="{
      align: 'start',
      collisionPadding: 16,
      side: 'top',
      sideOffset: 12,
    }"
    :items="menuItems"
    :ui="{ content: 'w-72' }"
  >
    <template #default="{ open }">
      <button
        class="flex w-full items-center gap-3 rounded-[1.2rem] border border-default/70 bg-elevated/70 px-3 py-3 text-left transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        :aria-label="t('shell.currentUser', { username })"
        type="button"
      >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UIcon
            class="size-5"
            name="i-lucide-circle-user-round"
          />
        </span>

        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-highlighted">
            {{ username }}
          </span>
        </span>

        <UIcon
          class="size-4 shrink-0 text-toned transition-transform"
          :class="open ? 'rotate-180' : ''"
          name="i-lucide-chevron-up"
        />
      </button>
    </template>
  </UDropdownMenu>
</template>
