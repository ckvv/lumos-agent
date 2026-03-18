<script setup lang="ts">
import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import type { DropdownMenuItem } from '@nuxt/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  isBusy?: boolean
  modelName: string | null
  providerName: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
  switchGroups: ChatModelSwitchGroup[]
}>()

const emit = defineEmits<{
  change: [value: { providerConfigId: number, modelId: string }]
}>()

const { t } = useI18n()

const hasOptions = computed(() =>
  props.switchGroups.some(group => group.models.length > 0),
)

const triggerLabel = computed(() =>
  props.modelName ?? t('chat.board.noModel'),
)

const menuItems = computed<DropdownMenuItem[][]>(() =>
  props.switchGroups
    .filter(group => group.models.length > 0)
    .map(group => [
      {
        label: group.providerName,
        type: 'label' as const,
      },
      ...group.models.map(model => ({
        checked:
          props.selectedProviderId === model.providerConfigId
          && props.selectedModelId === model.modelId,
        label: model.modelName,
        type: 'checkbox' as const,
        onUpdateChecked: (checked: boolean) => {
          if (!checked)
            return

          emit('change', {
            modelId: model.modelId,
            providerConfigId: model.providerConfigId,
          })
        },
      })),
    ]),
)
</script>

<template>
  <UDropdownMenu
    :content="{
      align: 'start',
      collisionPadding: 16,
      sideOffset: 10,
    }"
    :disabled="isBusy || !hasOptions"
    :items="menuItems"
    :ui="{ content: 'w-[22rem] max-w-[calc(100vw-2rem)]' }"
  >
    <UButton
      class="w-full rounded-full border border-default/70 bg-elevated/65 px-3 py-2 text-left data-[state=open]:bg-elevated"
      color="neutral"
      :disabled="isBusy || !hasOptions"
      icon="i-lucide-sparkles"
      trailing-icon="i-lucide-chevrons-up-down"
      variant="ghost"
      :ui="{
        base: 'justify-start',
        leadingIcon: 'shrink-0',
        trailingIcon: 'ms-auto shrink-0',
      }"
    >
      {{ triggerLabel }}
    </UButton>

    <template #content-top>
      <div class="border-b border-default/70 px-3 py-2">
        {{ t('chat.workspace.modelMenu') }}
      </div>
    </template>
  </UDropdownMenu>
</template>
