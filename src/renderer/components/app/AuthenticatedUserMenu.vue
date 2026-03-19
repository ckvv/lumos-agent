<script setup lang="ts">
import type { AppLocale } from '#renderer/composables/useLocale'
import AboutModal from '#renderer/components/app/AboutModal.vue'
import ProviderSettingsModal from '#renderer/components/providers/ProviderSettingsModal.vue'
import { useLocale } from '#renderer/composables/useLocale'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  currentUsername: string | null
  side?: 'bottom' | 'top'
}>(), {
  side: 'top',
})

const emit = defineEmits<{
  logout: []
}>()

const { t } = useI18n()
const { locale, localeOptions } = useLocale()
const isAboutOpen = shallowRef(false)
const isProviderSettingsOpen = shallowRef(false)

const username = computed(() => props.currentUsername ?? '-')

function handleLocaleChange(nextLocale: AppLocale) {
  locale.value = nextLocale
}

const localeMenuItems = computed(() =>
  localeOptions.map(option => ({
    checked: locale.value === option.value,
    type: 'checkbox',
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
      onSelect: () => {
        isProviderSettingsOpen.value = true
      },
    },
    {
      icon: 'i-lucide-info',
      label: t('navigation.routes.about'),
      onSelect: () => {
        isAboutOpen.value = true
      },
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
      side: props.side,
      sideOffset: 12,
    }"
    :items="menuItems"
    :ui="{ content: 'w-72' }"
  >
    <UButton
      :aria-label="t('shell.currentUser', { username })"
      square
      color="neutral"
      class="w-full data-[state=open]:bg-elevated overflow-hidden"
      size="xl"
      icon="i-lucide-circle-user-round"
      variant="ghost"
      trailing-icon="i-lucide-chevrons-up-down"
      :ui="{
        base: 'justify-start',
        leadingIcon: 'shrink-0',
        trailingIcon: 'ms-auto shrink-0',
      }"
      :label="username"
    />
  </UDropdownMenu>

  <AboutModal v-model:open="isAboutOpen" />

  <ProviderSettingsModal v-model:open="isProviderSettingsOpen" />
</template>
