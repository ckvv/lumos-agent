import type { OAuthLoginEvent, OAuthProviderOption, ProviderConfigDetail } from '#shared/chat/types'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { consumeEventIterator } from '@orpc/client'
import { computed, onBeforeUnmount, shallowReadonly, shallowRef } from 'vue'

interface OAuthLoginState {
  event: OAuthLoginEvent | null
  instructions: string | null
  isActive: boolean
  message: string | null
  providerId: string | null
  sessionId: string | null
  url: string | null
  waitingManualCode: boolean
}

const configs = shallowRef<ProviderConfigDetail[]>([])
const oauthProviders = shallowRef<OAuthProviderOption[]>([])
const errorMessage = shallowRef<string | null>(null)
const actionErrorMessage = shallowRef<string | null>(null)
const isLoading = shallowRef(false)
const isSaving = shallowRef(false)
const oauthState = shallowRef<OAuthLoginState>({
  event: null,
  instructions: null,
  isActive: false,
  message: null,
  providerId: null,
  sessionId: null,
  url: null,
  waitingManualCode: false,
})

let stopOAuthIterator: (() => Promise<void>) | null = null

function resetOAuthState() {
  oauthState.value = {
    event: null,
    instructions: null,
    isActive: false,
    message: null,
    providerId: null,
    sessionId: null,
    url: null,
    waitingManualCode: false,
  }
}

async function loadProviderConfigs() {
  const [providerConfigs, supportedOAuthProviders] = await Promise.all([
    runWithORPCClient(client => client.chat.providers.listConfigs()),
    runWithORPCClient(client => client.chat.providers.listOAuthProviders()),
  ])

  configs.value = providerConfigs
  oauthProviders.value = supportedOAuthProviders
}

export function useProviderSettings() {
  async function load() {
    isLoading.value = true
    errorMessage.value = null

    try {
      await loadProviderConfigs()
    }
    catch (error) {
      errorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  async function runMutation<T>(handler: () => Promise<T>) {
    isSaving.value = true
    actionErrorMessage.value = null

    try {
      const result = await handler()
      await loadProviderConfigs()
      return result
    }
    catch (error) {
      actionErrorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isSaving.value = false
    }
  }

  async function saveBuiltinApiKeyConfig(providerId: string, apiKey: string) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.providers.saveBuiltinApiKeyConfig({
        apiKey,
        providerId,
      })),
    )
  }

  async function saveCompatibleProviderConfig(payload: {
    apiKey?: string
    baseUrl: string
    compat: ProviderConfigDetail['compat']
    displayName: string
    id?: number
  }) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.providers.saveCompatibleProviderConfig(payload)),
    )
  }

  async function syncCompatibleModels(id: number) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.providers.syncCompatibleModels({ id })),
    )
  }

  async function saveCompatibleModel(payload: {
    contextWindow: number
    maxTokens: number
    modelId: string
    name: string
    providerConfigId: number
    reasoning: boolean
    supportsImageInput: boolean
  }) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.providers.saveCompatibleModel(payload)),
    )
  }

  async function deleteCompatibleModel(providerConfigId: number, modelId: string) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.providers.deleteCompatibleModel({
        modelId,
        providerConfigId,
      })),
    )
  }

  async function deleteConfig(id: number) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.providers.deleteConfig({ id })),
    )
  }

  async function setEnabled(id: number, isEnabled: boolean) {
    return runMutation(() =>
      runWithORPCClient(client => client.chat.providers.setEnabled({
        id,
        isEnabled,
      })),
    )
  }

  async function startOAuthLogin(providerId: string) {
    actionErrorMessage.value = null
    resetOAuthState()

    if (stopOAuthIterator) {
      await stopOAuthIterator()
      stopOAuthIterator = null
    }

    const iterator = await runWithORPCClient(client => client.chat.providers.startOAuthLogin({ providerId }))

    oauthState.value = {
      event: null,
      instructions: null,
      isActive: true,
      message: null,
      providerId,
      sessionId: null,
      url: null,
      waitingManualCode: false,
    }

    stopOAuthIterator = consumeEventIterator(iterator, {
      onError: (error) => {
        actionErrorMessage.value = getORPCErrorMessage(error)
      },
      onEvent: (event) => {
        oauthState.value = {
          event,
          instructions: event.type === 'auth_url' ? event.instructions ?? null : oauthState.value.instructions,
          isActive: event.type !== 'success' && event.type !== 'failed' && event.type !== 'canceled',
          message: 'message' in event ? event.message : null,
          providerId: event.providerId,
          sessionId: event.sessionId,
          url: event.type === 'auth_url' ? event.url : oauthState.value.url,
          waitingManualCode: event.type === 'waiting_manual_code',
        }

        if (event.type === 'success')
          void loadProviderConfigs()

        if (event.type === 'failed' || event.type === 'canceled')
          actionErrorMessage.value = event.message
      },
      onFinish: () => {
        oauthState.value = {
          ...oauthState.value,
          isActive: false,
        }
        stopOAuthIterator = null
      },
    })
  }

  async function submitManualOAuthCode(sessionId: string, code: string) {
    isSaving.value = true
    actionErrorMessage.value = null

    try {
      await runWithORPCClient(client => client.chat.providers.submitOAuthManualCode({
        code,
        sessionId,
      }))
    }
    catch (error) {
      actionErrorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isSaving.value = false
    }
  }

  onBeforeUnmount(() => {
    if (stopOAuthIterator)
      void stopOAuthIterator()
  })

  return {
    actionErrorMessage: shallowReadonly(actionErrorMessage),
    configs: shallowReadonly(configs),
    deleteCompatibleModel,
    deleteConfig,
    errorMessage: shallowReadonly(errorMessage),
    isLoading: shallowReadonly(isLoading),
    isSaving: shallowReadonly(isSaving),
    load,
    oauthProviders: shallowReadonly(oauthProviders),
    oauthState: shallowReadonly(oauthState),
    saveBuiltinApiKeyConfig,
    saveCompatibleModel,
    saveCompatibleProviderConfig,
    setEnabled,
    startOAuthLogin,
    submitManualOAuthCode,
    syncCompatibleModels,
    usableConfigCount: computed(() => configs.value.filter(config => config.isUsable).length),
  }
}
