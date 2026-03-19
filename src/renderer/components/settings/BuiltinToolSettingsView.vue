<script setup lang="ts">
import { useBuiltinToolSettings } from '#renderer/composables/useBuiltinToolSettings'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const builtinToolSettings = useBuiltinToolSettings()

function resolveAccessColor(access: 'execute' | 'read' | 'write') {
  switch (access) {
    case 'execute':
      return 'warning'
    case 'write':
      return 'secondary'
    default:
      return 'neutral'
  }
}

function resolveAccessLabel(access: 'execute' | 'read' | 'write') {
  switch (access) {
    case 'execute':
      return t('settings.tools.access.execute')
    case 'write':
      return t('settings.tools.access.write')
    default:
      return t('settings.tools.access.read')
  }
}

onMounted(async () => {
  await builtinToolSettings.load()
})
</script>

<template>
  <section class="grid gap-5">
    <UCard
      class="border-default/70 bg-default/92 shadow-sm"
      variant="subtle"
    >
      <template #header>
        <div class="grid gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              color="primary"
              :label="t('settings.tools.eyebrow')"
              variant="soft"
            />
            <UBadge
              color="neutral"
              :label="t('settings.tools.summary.enabled', { count: builtinToolSettings.enabledTools.value.length })"
              variant="soft"
            />
          </div>
          <h2 class="m-0 text-lg font-semibold text-highlighted">
            {{ t('settings.tools.title') }}
          </h2>
          <p class="m-0 text-sm leading-7 text-toned">
            {{ t('settings.tools.body') }}
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <UAlert
          v-if="builtinToolSettings.errorMessage.value || builtinToolSettings.actionErrorMessage.value"
          color="error"
          :description="builtinToolSettings.actionErrorMessage.value ?? builtinToolSettings.errorMessage.value ?? ''"
          :title="t('settings.errors.title')"
          variant="soft"
        />

        <UAlert
          color="neutral"
          :description="builtinToolSettings.workspaceRoot.value"
          :title="t('settings.tools.workspaceRoot')"
          variant="soft"
        />

        <UCard
          v-for="tool in builtinToolSettings.tools.value"
          :key="tool.name"
          class="border-default/70 bg-default/96"
          variant="subtle"
        >
          <template #header>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="m-0 text-base font-semibold text-highlighted">
                    {{ tool.label }}
                  </h3>
                  <UBadge
                    :color="tool.isEnabled ? 'primary' : 'neutral'"
                    :label="tool.isEnabled ? t('settings.states.enabled') : t('settings.states.disabled')"
                    variant="soft"
                  />
                  <UBadge
                    :color="resolveAccessColor(tool.access)"
                    :label="resolveAccessLabel(tool.access)"
                    variant="soft"
                  />
                </div>
                <p class="m-0 text-sm text-toned">
                  {{ tool.name }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UButton
                  :color="tool.isEnabled ? 'warning' : 'primary'"
                  :disabled="builtinToolSettings.isSaving.value"
                  :label="tool.isEnabled ? t('settings.actions.disable') : t('settings.actions.enable')"
                  @click="builtinToolSettings.setEnabled(tool.name, !tool.isEnabled)"
                />
              </div>
            </div>
          </template>

          <p class="m-0 text-sm leading-7 text-toned">
            {{ tool.description }}
          </p>
        </UCard>
      </div>
    </UCard>
  </section>
</template>
