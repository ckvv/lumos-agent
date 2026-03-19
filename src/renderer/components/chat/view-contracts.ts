import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'

export interface ChatConversationViewProps {
  conversationTitle?: string | null
  isLoading?: boolean
  messages: readonly ConversationMessageRecord[]
  partialAssistantMessage: AssistantMessage | null
}
