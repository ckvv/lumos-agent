<script setup lang="ts">
import AppNavigation from '#renderer/components/AppNavigation.vue'
import LocaleSwitcher from '#renderer/components/LocaleSwitcher.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  currentUsername: string | null
  showSecurityWarning: boolean
}>()

const emit = defineEmits<{
  logout: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex h-full flex-col gap-6 rounded-[1.8rem] border border-default/70 bg-default/92 p-5 shadow-sm">
    <header class="grid gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          color="primary"
          :label="t('shell.eyebrow')"
          variant="soft"
        />
        <UBadge
          v-if="showSecurityWarning"
          color="warning"
          :label="t('shell.securityWarning')"
          variant="soft"
        />
      </div>

      <div class="grid gap-2">
        <div class="grid gap-1">
          <h1 class="m-0 text-lg font-semibold tracking-tight text-highlighted">
            {{ t('shell.title') }}
          </h1>
          <p class="m-0 text-sm leading-6 text-toned">
            {{ t('shell.description', { username: currentUsername ?? '-' }) }}
          </p>
        </div>
        <p class="m-0 text-xs text-toned">
          {{ t('shell.currentUser', { username: currentUsername ?? '-' }) }}
        </p>
      </div>
    </header>

    <AppNavigation orientation="vertical" />

    <div class="mt-auto grid gap-3 rounded-[1.3rem] border border-default/70 bg-elevated/60 p-3">
      <div class="grid gap-1">
        <label class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
          {{ t('shell.languageLabel') }}
        </label>
        <LocaleSwitcher />
      </div>

      <UButton
        class="w-full justify-center rounded-[1rem]"
        color="neutral"
        :label="t('shell.logout')"
        type="button"
        variant="outline"
        @click="emit('logout')"
      />
    </div>
  </div>
</template>
