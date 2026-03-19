<script setup lang="ts">
import type { ChatToolResultDetails } from '#shared/agent/types'
import type { ConversationMessageRecord } from '#shared/chat/types'
import type {
  AssistantMessage,
  Message,
} from '@mariozechner/pi-ai'
import { parseChatToolName } from '#shared/agent/tool-names'
import MarkdownRender from 'markstream-vue'
import { computed } from 'vue'

const props = defineProps<{
  isPartial?: boolean
  message: Readonly<AssistantMessage> | Readonly<Message>
  messageRecord?: Readonly<ConversationMessageRecord> | null
}>()

const isToolResult = computed(() => props.message.role === 'toolResult')
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

  return props.message.content
    .filter(block => block.type === 'toolCall')
    .map((block) => {
      const parsedToolName = parseChatToolName(block.name)

      return {
        ...block,
        displayLabel: parsedToolName?.displayLabel ?? block.name,
        kind: parsedToolName?.kind ?? null,
      }
    })
})

const assistantErrorMessage = computed(() => {
  if (props.message.role !== 'assistant')
    return null

  if (props.message.stopReason !== 'error')
    return null

  return props.message.errorMessage ?? null
})

const toolResultDetails = computed<ChatToolResultDetails | null>(() => {
  if (props.message.role !== 'toolResult')
    return null

  return props.message.details as ChatToolResultDetails | null
})

const toolResultText = computed(() => {
  if (props.message.role !== 'toolResult')
    return ''

  return props.message.content
    .map((block) => {
      if (block.type === 'text')
        return block.text

      return '[image]'
    })
    .join('\n\n')
})

const explicitSkillLabel = computed(() =>
  props.messageRecord?.invocationMetadata?.explicitSkillName ?? null,
)
</script>

<template>
  <article
    class="grid gap-3 rounded-[1.35rem] border p-4"
    :class="isUser
      ? 'ml-auto max-w-3xl border-primary/20 bg-primary/7'
      : isToolResult
        ? 'max-w-4xl border-default/70 bg-elevated/40'
        : 'max-w-4xl border-default/0 bg-transparent'"
  >
    <div class="flex items-center gap-2">
      <UBadge
        :color="isUser ? 'primary' : isToolResult ? 'secondary' : 'neutral'"
        :label="isUser ? 'User' : isToolResult ? 'Tool Result' : 'Assistant'"
        variant="soft"
      />
      <UBadge
        v-if="isUser && explicitSkillLabel"
        color="secondary"
        :label="`/${explicitSkillLabel}`"
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
      v-if="isUser"
      class="prose prose-slate max-w-none text-sm leading-7 text-highlighted"
    >
      <MarkdownRender
        :content="userContent"
        :final="!isPartial"
        :typewriter="false"
      />
    </div>

    <template v-else-if="isToolResult">
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          v-if="toolResultDetails?.source"
          :color="toolResultDetails.source.kind === 'mcp' ? 'primary' : 'secondary'"
          :label="toolResultDetails.source.kind === 'mcp' ? 'MCP' : 'Skill'"
          variant="soft"
        />
        <UBadge
          v-if="toolResultDetails?.toolDisplayLabel"
          color="neutral"
          :label="toolResultDetails.toolDisplayLabel"
          variant="soft"
        />
      </div>

      <div class="prose prose-slate max-w-none text-sm leading-7 text-highlighted">
        <MarkdownRender
          :content="toolResultText"
          :final="!isPartial"
          :typewriter="false"
        />
      </div>

      <pre
        v-if="toolResultDetails?.payload"
        class="overflow-x-auto rounded-[1rem] border border-default/70 bg-muted/40 p-3 text-xs leading-6 text-toned"
      >{{ JSON.stringify(toolResultDetails.payload, null, 2) }}</pre>
    </template>

    <template v-else>
      <UAlert
        v-if="assistantErrorMessage"
        color="error"
        :description="assistantErrorMessage"
        title="Request failed"
        variant="soft"
      />

      <details
        v-for="(block, index) in assistantThinkingBlocks"
        :key="`${index}-${block.type}`"
        class="rounded-[1.15rem] border border-default/70 bg-elevated/70 p-3"
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
          :color="block.kind === 'mcp' ? 'primary' : block.kind === 'skill' ? 'secondary' : 'neutral'"
          :label="block.displayLabel"
          variant="soft"
        />
      </div>
    </template>
  </article>
</template>
