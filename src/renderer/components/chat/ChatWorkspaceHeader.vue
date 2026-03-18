<script setup lang="ts">
import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import ChatModelSwitcher from '#renderer/components/chat/ChatModelSwitcher.vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  isBusy?: boolean
  modelName: string | null
  modelSwitchGroups: ChatModelSwitchGroup[]
  providerLoadError: string | null
  providerName: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
}>()

const emit = defineEmits<{
  runtimeChange: [value: { providerConfigId: number, modelId: string }]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="grid justify-items-end gap-3">
    <ChatModelSwitcher
      class="w-full sm:w-[20rem]"
      :is-busy="isBusy"
      :model-name="modelName"
      :provider-name="providerName"
      :selected-model-id="selectedModelId"
      :selected-provider-id="selectedProviderId"
      :switch-groups="modelSwitchGroups"
      @change="emit('runtimeChange', $event)"
    />

    <UAlert
      v-if="providerLoadError"
      color="warning"
      :description="providerLoadError"
      :title="t('chat.board.providerLoadError')"
      variant="soft"
    />
  </section>
</template>
