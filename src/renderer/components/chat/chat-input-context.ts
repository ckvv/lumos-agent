import type { ChatWorkspace } from '#renderer/composables/useChatWorkspace'
import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

export interface ChatInputState extends Pick<ChatWorkspace, | 'canSend'
  | 'composerValue'
  | 'isSending'
  | 'modelSwitchGroups'
  | 'selectedModelId'
  | 'selectedModelName'
  | 'selectedProviderId'
  | 'selectedProviderName'> {}

export interface ChatInputActions extends Pick<ChatWorkspace, | 'handleRuntimeChange'
  | 'handleSendMessage'
  | 'handleStopMessage'> {}

export interface ChatInputContext {
  actions: ChatInputActions
  state: ChatInputState
}

const chatInputContextKey: InjectionKey<ChatInputContext> = Symbol('chat-input-context')

export function provideChatInputContext(workspace: ChatWorkspace) {
  const context: ChatInputContext = {
    actions: {
      handleRuntimeChange: workspace.handleRuntimeChange,
      handleSendMessage: workspace.handleSendMessage,
      handleStopMessage: workspace.handleStopMessage,
    },
    state: {
      canSend: workspace.canSend,
      composerValue: workspace.composerValue,
      isSending: workspace.isSending,
      modelSwitchGroups: workspace.modelSwitchGroups,
      selectedModelId: workspace.selectedModelId,
      selectedModelName: workspace.selectedModelName,
      selectedProviderId: workspace.selectedProviderId,
      selectedProviderName: workspace.selectedProviderName,
    },
  }

  provide(chatInputContextKey, context)

  return context
}

export function useChatInputContext() {
  const context = inject(chatInputContextKey, null)

  if (!context)
    throw new Error('Chat input context is missing')

  return context
}
