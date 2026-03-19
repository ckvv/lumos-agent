import type { ChatWorkspace } from '#renderer/composables/useChatWorkspace'
import type { InjectionKey } from 'vue'
import { inject, provide } from 'vue'

export type ChatInputContext = Pick<ChatWorkspace, | 'canSend'
  | 'composerValue'
  | 'handleRuntimeChange'
  | 'handleSendMessage'
  | 'handleStopMessage'
  | 'isSending'
  | 'modelSwitchGroups'
  | 'selectedModelId'
  | 'selectedModelName'
  | 'selectedProviderId'
  | 'selectedProviderName'>

const chatInputContextKey: InjectionKey<ChatInputContext> = Symbol('chat-input-context')

export function provideChatInputContext(workspace: ChatWorkspace) {
  const context: ChatInputContext = {
    canSend: workspace.canSend,
    composerValue: workspace.composerValue,
    handleRuntimeChange: workspace.handleRuntimeChange,
    handleSendMessage: workspace.handleSendMessage,
    handleStopMessage: workspace.handleStopMessage,
    isSending: workspace.isSending,
    modelSwitchGroups: workspace.modelSwitchGroups,
    selectedModelId: workspace.selectedModelId,
    selectedModelName: workspace.selectedModelName,
    selectedProviderId: workspace.selectedProviderId,
    selectedProviderName: workspace.selectedProviderName,
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
