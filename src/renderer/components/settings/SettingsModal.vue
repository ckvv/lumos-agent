<script setup lang="ts">
import AppModalShell from '#renderer/components/app/AppModalShell.vue'
import ProviderSettingsView from '#renderer/components/providers/ProviderSettingsView.vue'
import BuiltinToolSettingsView from '#renderer/components/settings/BuiltinToolSettingsView.vue'
import McpSettingsView from '#renderer/components/settings/McpSettingsView.vue'
import SkillSettingsView from '#renderer/components/settings/SkillSettingsView.vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

type SettingsTab = 'mcp' | 'providers' | 'skills' | 'tools'

const { t } = useI18n()

const open = defineModel<boolean>('open', {
  default: false,
})

const activeTab = shallowRef<SettingsTab>('providers')

const tabItems = computed(() => [
  {
    id: 'providers' as const,
    label: t('settings.tabs.providers'),
  },
  {
    id: 'mcp' as const,
    label: t('settings.tabs.mcp'),
  },
  {
    id: 'skills' as const,
    label: t('settings.tabs.skills'),
  },
  {
    id: 'tools' as const,
    label: t('settings.tabs.tools'),
  },
])

watch(open, (isOpen) => {
  if (isOpen)
    activeTab.value = 'providers'
})
</script>

<template>
  <AppModalShell
    v-model:open="open"
    :title="t('navigation.routes.settings')"
  >
    <section class="grid gap-5">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="item in tabItems"
          :key="item.id"
          :color="activeTab === item.id ? 'primary' : 'neutral'"
          :label="item.label"
          :variant="activeTab === item.id ? 'solid' : 'soft'"
          @click="activeTab = item.id"
        />
      </div>

      <ProviderSettingsView v-if="activeTab === 'providers' && open" />
      <McpSettingsView v-else-if="activeTab === 'mcp' && open" />
      <SkillSettingsView v-else-if="activeTab === 'skills' && open" />
      <BuiltinToolSettingsView v-else-if="activeTab === 'tools' && open" />
    </section>
  </AppModalShell>
</template>
