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
  <article class="grid gap-3 rounded-3xl border border-slate-300/40 bg-white/88 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
    <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
      {{ t('home.sections.runtimeBridge') }}
    </p>
    <h3 class="m-0 text-[1.15rem] font-bold text-slate-900">
      {{ t('home.runtimeBridge.title') }}
    </h3>
    <p class="m-0 max-w-[60ch] text-base leading-[1.7] text-slate-600">
      {{ t('home.runtimeBridge.body') }}
    </p>

    <p
      v-if="isLoading"
      class="m-0 text-sm text-slate-500"
    >
      {{ t('home.runtimeBridge.loading') }}
    </p>

    <div
      v-else-if="appInfo"
      class="flex flex-wrap gap-2.5"
    >
      <span class="rounded-full border border-teal-700/12 bg-teal-700/8 px-3 py-2 text-[0.85rem] font-bold text-teal-800">
        {{ t('home.runtimeBridge.labels.version', { value: appInfo.version }) }}
      </span>
      <span class="rounded-full border border-teal-700/12 bg-teal-700/8 px-3 py-2 text-[0.85rem] font-bold text-teal-800">
        {{ t('home.runtimeBridge.labels.electron', { value: appInfo.electronVersion }) }}
      </span>
      <span class="rounded-full border border-teal-700/12 bg-teal-700/8 px-3 py-2 text-[0.85rem] font-bold text-teal-800">
        {{ t('home.runtimeBridge.labels.platform', { value: appInfo.platform }) }}
      </span>
      <span class="rounded-full border border-teal-700/12 bg-teal-700/8 px-3 py-2 text-[0.85rem] font-bold text-teal-800">
        {{ t('home.runtimeBridge.labels.locale', { value: appInfo.locale }) }}
      </span>
    </div>

    <p
      v-else-if="errorMessage"
      class="m-0 text-sm leading-[1.7] text-rose-600"
    >
      {{ t('home.runtimeBridge.error', { message: errorMessage }) }}
    </p>
  </article>
</template>
