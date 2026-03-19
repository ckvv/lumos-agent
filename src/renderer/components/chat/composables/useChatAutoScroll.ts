import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'
import { nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'

interface UseChatAutoScrollOptions {
  messages: () => readonly ConversationMessageRecord[]
  partialAssistantMessage: () => AssistantMessage | null
}

const AUTO_SCROLL_THRESHOLD = 80

export function useChatAutoScroll(options: UseChatAutoScrollOptions) {
  const messageListElement = shallowRef<HTMLDivElement | null>(null)
  const isPinnedToBottom = shallowRef(true)

  let scrollAnimationFrameId: number | null = null

  function updatePinnedToBottomState() {
    const element = messageListElement.value

    if (!element)
      return

    const distanceToBottom = element.scrollHeight - element.clientHeight - element.scrollTop
    isPinnedToBottom.value = distanceToBottom <= AUTO_SCROLL_THRESHOLD
  }

  function scheduleScrollToBottom(options?: { force?: boolean }) {
    if (!options?.force && !isPinnedToBottom.value)
      return

    if (scrollAnimationFrameId !== null)
      cancelAnimationFrame(scrollAnimationFrameId)

    scrollAnimationFrameId = requestAnimationFrame(() => {
      scrollAnimationFrameId = null

      const element = messageListElement.value

      if (!element)
        return

      element.scrollTop = element.scrollHeight
      updatePinnedToBottomState()
    })
  }

  function handleMessageListScroll() {
    updatePinnedToBottomState()
  }

  watch(
    () => options.messages()[0]?.conversationId ?? null,
    async () => {
      isPinnedToBottom.value = true
      await nextTick()
      scheduleScrollToBottom({ force: true })
    },
  )

  watch(
    () => options.messages().length,
    async () => {
      await nextTick()
      scheduleScrollToBottom()
    },
  )

  watch(
    () => options.partialAssistantMessage(),
    async () => {
      await nextTick()
      scheduleScrollToBottom()
    },
  )

  onBeforeUnmount(() => {
    if (scrollAnimationFrameId !== null)
      cancelAnimationFrame(scrollAnimationFrameId)
  })

  return {
    handleMessageListScroll,
    messageListElement,
  }
}
