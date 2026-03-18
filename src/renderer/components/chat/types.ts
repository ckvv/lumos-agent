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
