<script setup lang="ts">
import type {
  AssistantMessage,
  Message,
} from '@mariozechner/pi-ai'
import MarkdownRender from 'markstream-vue'
import { computed } from 'vue'

const props = defineProps<{
  isPartial?: boolean
  message: Readonly<AssistantMessage> | Readonly<Message>
}>()

const isAssistant = computed(() => props.message.role === 'assistant')
const isUser = computed(() => props.message.role === 'user')

const userContent = computed(() => {
  if (props.message.role === 'assistant')
    return ''

  if (typeof props.message.content === 'string')
    return props.message.content

  return props.message.content
    .map(block => block.type === 'text' ? block.text : '[image]')
    .join('\n\n')
})

const assistantTextBlocks = computed(() => {
  if (props.message.role !== 'assistant')
    return []

  return props.message.content.filter(block => block.type === 'text')
})

const assistantThinkingBlocks = computed(() => {
  if (props.message.role !== 'assistant')
    return []

  return props.message.content.filter(block => block.type === 'thinking')
})

const assistantToolCallBlocks = computed(() => {
  if (props.message.role !== 'assistant')
    return []

  return props.message.content.filter(block => block.type === 'toolCall')
})
</script>

<template>
  <article
    class="grid gap-3 rounded-[1.6rem] border p-4 shadow-lg shadow-slate-200/45"
    :class="isUser
      ? 'ml-auto max-w-3xl border-primary/20 bg-primary/8'
      : 'max-w-4xl border-default/70 bg-default/92'"
  >
    <div class="flex items-center gap-2">
      <UBadge
        :color="isUser ? 'primary' : 'neutral'"
        :label="isUser ? 'User' : 'Assistant'"
        variant="soft"
      />
      <UBadge
        v-if="isPartial"
        color="warning"
        label="Streaming"
        variant="soft"
      />
    </div>

    <div
      v-if="!isAssistant"
      class="prose prose-slate max-w-none text-sm leading-7 text-highlighted"
    >
      <MarkdownRender
        :content="userContent"
        :final="!isPartial"
        :typewriter="false"
      />
    </div>

    <template v-else>
      <details
        v-for="(block, index) in assistantThinkingBlocks"
        :key="`${index}-${block.type}`"
        class="rounded-2xl border border-default/70 bg-elevated/80 p-3"
      >
        <summary class="cursor-pointer text-sm font-medium text-toned">
          Thinking
        </summary>
        <div class="mt-3 prose prose-slate max-w-none text-sm leading-7">
          <MarkdownRender
            :content="block.thinking"
            :final="!isPartial"
            :typewriter="false"
          />
        </div>
      </details>

      <div
        v-for="(block, index) in assistantTextBlocks"
        :key="`${index}-${block.type}`"
        class="prose prose-slate max-w-none text-sm leading-7"
      >
        <MarkdownRender
          :content="block.text"
          :final="!isPartial"
          :typewriter="false"
        />
      </div>

      <div
        v-if="assistantToolCallBlocks.length > 0"
        class="flex flex-wrap gap-2"
      >
        <UBadge
          v-for="block in assistantToolCallBlocks"
          :key="block.id"
          color="secondary"
          :label="block.name"
          variant="soft"
        />
      </div>
    </template>
  </article>
</template>
