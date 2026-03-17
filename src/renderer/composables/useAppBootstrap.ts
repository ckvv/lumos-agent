import type { AppBootstrapSnapshot, Client } from '#renderer/orpc/client'
import type { AuthBootstrapState, AuthCredentialsInput } from '#shared/auth/types'
import { getORPCClient, resetORPCClient, shouldRetryORPCTransport } from '#renderer/orpc/client'
import { computed, shallowReadonly, shallowRef } from 'vue'

type BootstrapViewState = 'failed' | 'initializing' | 'ready'

const bootstrapState = shallowRef<AppBootstrapSnapshot | null>(null)
const bootstrapTransportError = shallowRef<string | null>(null)
const actionErrorMessage = shallowRef<string | null>(null)
const isBootstrapping = shallowRef(false)
const isSubmitting = shallowRef(false)

let bootstrapPromise: Promise<AppBootstrapSnapshot> | null = null
let bootstrapPollTimer: number | null = null

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

async function runWithClient<T>(handler: (client: Client) => Promise<T>) {
  try {
    return await handler(await getORPCClient())
  }
  catch (error) {
    if (!shouldRetryORPCTransport(error))
      throw error

    resetORPCClient()
    return handler(await getORPCClient())
  }
}

function stopBootstrapPolling() {
  if (bootstrapPollTimer === null || typeof window === 'undefined')
    return

  window.clearTimeout(bootstrapPollTimer)
  bootstrapPollTimer = null
}

async function requestBootstrapState() {
  return runWithClient(client => client.app.getBootstrap())
}

export function useAppBootstrap() {
  function scheduleBootstrapPolling() {
    if (bootstrapPollTimer !== null || typeof window === 'undefined')
      return

    bootstrapPollTimer = window.setTimeout(async () => {
      bootstrapPollTimer = null

      try {
        const snapshot = await refreshBootstrap()

        if (snapshot.database.status === 'idle' || snapshot.database.status === 'initializing')
          scheduleBootstrapPolling()
      }
      catch {
      }
    }, 600)
  }

  function applyBootstrapSnapshot(snapshot: AppBootstrapSnapshot) {
    bootstrapState.value = snapshot
    bootstrapTransportError.value = null

    if (snapshot.database.status === 'idle' || snapshot.database.status === 'initializing') {
      scheduleBootstrapPolling()
      return
    }

    stopBootstrapPolling()
  }

  async function runAuthMutation(handler: (client: Client) => Promise<AppBootstrapSnapshot>) {
    isSubmitting.value = true
    actionErrorMessage.value = null

    try {
      const snapshot = await runWithClient(handler)
      applyBootstrapSnapshot(snapshot)
      return snapshot
    }
    catch (error) {
      actionErrorMessage.value = getErrorMessage(error)
      throw error
    }
    finally {
      isSubmitting.value = false
    }
  }

  const viewState = computed<BootstrapViewState>(() => {
    if (!bootstrapState.value)
      return bootstrapTransportError.value ? 'failed' : 'initializing'

    if (bootstrapState.value.database.status === 'idle' || bootstrapState.value.database.status === 'initializing')
      return 'initializing'

    if (bootstrapState.value.database.status === 'failed')
      return 'failed'

    return 'ready'
  })

  const authState = computed<AuthBootstrapState | null>(() =>
    viewState.value === 'ready' ? bootstrapState.value?.auth.state ?? null : null,
  )

  const isAuthenticated = computed(() => bootstrapState.value?.auth.isAuthenticated ?? false)
  const hasUsableProvider = computed(() => bootstrapState.value?.providerSummary.hasUsableProvider ?? false)
  const currentUsername = computed(() => bootstrapState.value?.auth.currentUsername ?? null)
  const recommendedRoute = computed(() => bootstrapState.value?.routing.recommendedRoute ?? '/auth')
  const initializationErrorMessage = computed(() =>
    bootstrapState.value?.database.errorMessage ?? bootstrapTransportError.value,
  )

  async function refreshBootstrap() {
    if (bootstrapPromise)
      return bootstrapPromise

    isBootstrapping.value = true

    bootstrapPromise = requestBootstrapState()
      .then((snapshot) => {
        applyBootstrapSnapshot(snapshot)
        return snapshot
      })
      .catch((error) => {
        bootstrapTransportError.value = getErrorMessage(error)
        stopBootstrapPolling()
        throw error
      })
      .finally(() => {
        isBootstrapping.value = false
        bootstrapPromise = null
      })

    return bootstrapPromise
  }

  async function ensureBootstrapped() {
    if (bootstrapState.value)
      return bootstrapState.value

    return refreshBootstrap()
  }

  async function login(credentials: AuthCredentialsInput) {
    return runAuthMutation(client => client.auth.login(credentials))
  }

  async function register(credentials: AuthCredentialsInput) {
    return runAuthMutation(client => client.auth.register(credentials))
  }

  async function logout() {
    return runAuthMutation(client => client.auth.logout())
  }

  async function retryBootstrap() {
    stopBootstrapPolling()
    actionErrorMessage.value = null
    await refreshBootstrap()
  }

  return {
    actionErrorMessage: shallowReadonly(actionErrorMessage),
    authState: shallowReadonly(authState),
    bootstrapState: shallowReadonly(bootstrapState),
    currentUsername: shallowReadonly(currentUsername),
    ensureBootstrapped,
    hasUsableProvider: shallowReadonly(hasUsableProvider),
    initializationErrorMessage: shallowReadonly(initializationErrorMessage),
    isAuthenticated: shallowReadonly(isAuthenticated),
    isBootstrapping: shallowReadonly(isBootstrapping),
    isSubmitting: shallowReadonly(isSubmitting),
    login,
    logout,
    recommendedRoute: shallowReadonly(recommendedRoute),
    refreshBootstrap,
    register,
    retryBootstrap,
    viewState: shallowReadonly(viewState),
  }
}
