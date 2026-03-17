<script setup lang="ts">
import { useAppInfo } from '#renderer/composables/useAppInfo'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { appInfo, errorMessage, isLoading, refresh } = useAppInfo()

onMounted(() => {
  void refresh()
})
</script>

<template>
  <UCard
    class="border-accented bg-default/90 shadow-lg"
    variant="subtle"
  >
    <template #header>
      <div class="grid gap-3">
        <UBadge
          class="w-fit"
          color="primary"
          :label="t('home.sections.runtimeBridge')"
          variant="soft"
        />
        <div class="grid gap-2">
          <h3 class="m-0 text-xl font-semibold text-highlighted">
            {{ t('home.runtimeBridge.title') }}
          </h3>
          <p class="m-0 max-w-[60ch] text-base leading-7 text-toned">
            {{ t('home.runtimeBridge.body') }}
          </p>
        </div>
      </div>
    </template>

    <div
      v-if="isLoading"
      class="grid gap-3 sm:grid-cols-2"
    >
      <USkeleton
        v-for="index in 4"
        :key="index"
        class="h-11 rounded-full"
      />
    </div>

    <div
      v-else-if="appInfo"
      class="flex flex-wrap gap-2.5"
    >
      <UBadge
        color="primary"
        :label="t('home.runtimeBridge.labels.version', { value: appInfo.version })"
        size="lg"
        variant="subtle"
      />
      <UBadge
        color="primary"
        :label="t('home.runtimeBridge.labels.electron', { value: appInfo.electronVersion })"
        size="lg"
        variant="subtle"
      />
      <UBadge
        color="primary"
        :label="t('home.runtimeBridge.labels.platform', { value: appInfo.platform })"
        size="lg"
        variant="subtle"
      />
      <UBadge
        color="primary"
        :label="t('home.runtimeBridge.labels.locale', { value: appInfo.locale })"
        size="lg"
        variant="subtle"
      />
    </div>

    <UAlert
      v-else-if="errorMessage"
      color="error"
      :description="t('home.runtimeBridge.error', { message: errorMessage })"
      icon="i-lucide-circle-alert"
      variant="subtle"
    />

    <p
      v-else
      class="m-0 text-sm text-muted"
    >
      {{ t('home.runtimeBridge.loading') }}
    </p>
  </UCard>
</template>
