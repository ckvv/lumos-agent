<script setup lang="ts">
import type { ChatComposerRuntimeSelection, ChatComposerStateProps } from '#renderer/components/chat/types'
import ChatModelSwitcher from '#renderer/components/chat/ChatModelSwitcher.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<ChatComposerStateProps>()
const emit = defineEmits<{
  runtimeChange: [value: ChatComposerRuntimeSelection]
  send: []
  stop: []
}>()
const composerValue = defineModel<string>('composerValue', {
  required: true,
})
const { t } = useI18n()

const slashSkillQuery = computed(() => {
  if (!composerValue.value.startsWith('/'))
    return null

  const rawQuery = composerValue.value.slice(1)

  if (rawQuery.includes(' '))
    return null

  return rawQuery.trim().toLowerCase()
})

const filteredSlashSkills = computed(() => {
  if (slashSkillQuery.value === null)
    return []

  return props.activeSkills.filter(skill =>
    skill.name.toLowerCase().includes(slashSkillQuery.value ?? ''),
  )
})

const showSlashSkills = computed(() =>
  slashSkillQuery.value !== null && filteredSlashSkills.value.length > 0,
)

function handleSelectSkill(name: string) {
  composerValue.value = `/${name} `
}

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.key !== 'Enter' || event.shiftKey)
    return

  if (!props.canSend)
    return

  event.preventDefault()
  emit('send')
}
</script>

<template>
  <div class="chat-input-panel rounded-[1.6rem] border border-default/70 bg-default/95 shadow-sm transition-shadow focus-within:shadow-md">
    <UTextarea
      v-model="composerValue"
      autoresize
      class="w-full"
      color="neutral"
      :disabled="props.isSending"
      :maxrows="6"
      :placeholder="t('chat.composer.placeholder')"
      :rows="2"
      variant="none"
      :ui="{
        base: [
          'chat-input-panel__field min-h-28 resize-none px-5 pt-5 pb-3 text-base leading-7 text-highlighted',
        ],
      }"
      @keydown="handleComposerKeydown"
    />

    <div
      v-if="showSlashSkills"
      class="grid gap-2 border-t border-default/70 px-4 pt-3"
    >
      <p class="m-0 text-xs uppercase tracking-[0.2em] text-toned">
        {{ t('chat.composer.skillWakeup') }}
      </p>

      <div class="flex flex-wrap gap-2 pb-1">
        <UButton
          v-for="skill in filteredSlashSkills"
          :key="skill.id"
          color="neutral"
          :label="`/${skill.name}`"
          size="sm"
          variant="soft"
          @click="handleSelectSkill(skill.name)"
        />
      </div>
    </div>

    <div class="grid grid-cols-[1fr_auto] items-end gap-3 px-4 py-3">
      <ChatModelSwitcher
        class="min-w-0 max-w-full justify-self-start"
        :is-busy="props.isSending"
        :model-name="props.selectedModelName"
        :provider-name="props.selectedProviderName"
        :selected-model-id="props.selectedModelId"
        :selected-provider-id="props.selectedProviderId"
        :switch-groups="props.modelSwitchGroups"
        @change="emit('runtimeChange', $event)"
      />

      <UButton
        class="shrink-0 rounded-full shadow-sm"
        :aria-label="props.isSending ? t('chat.composer.pause') : t('chat.composer.send')"
        :color="props.isSending ? 'warning' : 'primary'"
        :disabled="props.isSending ? false : !props.canSend"
        :icon="props.isSending ? 'i-lucide-square' : 'i-lucide-send-horizontal'"
        size="lg"
        square
        :title="props.isSending ? t('chat.composer.pause') : t('chat.composer.send')"
        @click="props.isSending ? emit('stop') : emit('send')"
      />
    </div>
  </div>
</template>
