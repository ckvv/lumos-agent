import type { ChatModelSwitchGroup } from '#renderer/components/chat/types'
import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'

export interface ChatRuntimeChangePayload {
  providerConfigId: number
  modelId: string
}

export interface ChatComposerViewProps {
  canSend: boolean
  errorMessage: string | null
  isSending?: boolean
  modelSwitchGroups: ChatModelSwitchGroup[]
  modelName: string | null
  providerLoadError: string | null
  providerName: string | null
  selectedModelId: string | null
  selectedProviderId: number | null
}

export interface ChatNewConversationViewProps extends ChatComposerViewProps {}

export interface ChatConversationViewProps extends ChatComposerViewProps {
  conversationTitle?: string | null
  isLoading?: boolean
  messages: readonly ConversationMessageRecord[]
  partialAssistantMessage: AssistantMessage | null
}
