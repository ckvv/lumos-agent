import type { ChatToolExecutionPayload, SkillSummary } from '#shared/agent/types'
import type { ConversationMessageRecord } from '#shared/chat/types'
import type { AssistantMessage } from '@mariozechner/pi-ai'

export interface ChatModelSwitchOption {
  modelId: string
  modelName: string
  providerConfigId: number
  providerName: string
}

export interface ChatModelSwitchGroup {
  providerConfigId: number
  providerName: string
  models: ChatModelSwitchOption[]
}

export interface ChatComposerStateProps {
  activeSkills: SkillSummary[]
  canSend: boolean
  isSending: boolean
  modelSwitchGroups: ChatModelSwitchGroup[]
  selectedModelId: string | null
  selectedModelName: string | null
  selectedProviderId: number | null
  selectedProviderName: string | null
}

export interface ChatComposerRuntimeSelection {
  providerConfigId: number
  modelId: string
}

export interface ChatWorkspaceViewProps extends ChatComposerStateProps {
  isConversationLoading?: boolean
  messages?: readonly ConversationMessageRecord[]
  partialAssistantMessage?: AssistantMessage | null
  transientToolExecutions?: readonly (ChatToolExecutionPayload & {
    partialResult: unknown | null
    result: unknown | null
    status: 'error' | 'running' | 'success'
  })[]
}
