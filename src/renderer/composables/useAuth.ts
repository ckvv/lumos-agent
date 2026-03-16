import type { AuthBootstrapSnapshot, Client } from '#renderer/orpc/client'
import type { AuthBootstrapState, AuthCredentialsInput } from '#shared/auth/types'
import { getORPCClient } from '#renderer/orpc/client'
import { computed, readonly, shallowRef } from 'vue'

type AuthViewState = 'failed' | 'initializing' | AuthBootstrapState

const bootstrapState = shallowRef<AuthBootstrapSnapshot | null>(null)
const bootstrapTransportError = shallowRef<string | null>(null)
const actionErrorMessage = shallowRef<string | null>(null)
const isBootstrapping = shallowRef(false)
const isSubmitting = shallowRef(false)

let bootstrapPromise: Promise<AuthBootstrapSnapshot> | null = null
let bootstrapPollTimer: number | null = null

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

function stopBootstrapPolling() {
  if (bootstrapPollTimer === null || typeof window === 'undefined')
    return

  window.clearTimeout(bootstrapPollTimer)
  bootstrapPollTimer = null
}

async function requestBootstrapState() {
  const client = await getORPCClient()
  return client.auth.getBootstrapState()
}

export function useAuth() {
  function scheduleBootstrapPolling() {
    if (bootstrapPollTimer !== null || typeof window === 'undefined')
      return

    bootstrapPollTimer = window.setTimeout(async () => {
      bootstrapPollTimer = null

      try {
        const snapshot = await refreshBootstrap()

        if (snapshot.databaseInitStatus === 'idle' || snapshot.databaseInitStatus === 'initializing')
          scheduleBootstrapPolling()
      }
      catch {
      }
    }, 600)
  }

  function applyBootstrapSnapshot(snapshot: AuthBootstrapSnapshot) {
    bootstrapState.value = snapshot
    bootstrapTransportError.value = null

    if (snapshot.databaseInitStatus === 'idle' || snapshot.databaseInitStatus === 'initializing') {
      scheduleBootstrapPolling()
      return
    }

    stopBootstrapPolling()
  }

  async function runAuthMutation(
    handler: (client: Client) => Promise<AuthBootstrapSnapshot>,
  ) {
    isSubmitting.value = true
    actionErrorMessage.value = null

    try {
      const client = await getORPCClient()
      const snapshot = await handler(client)
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

  const viewState = computed<AuthViewState>(() => {
    if (!bootstrapState.value)
      return bootstrapTransportError.value ? 'failed' : 'initializing'

    if (bootstrapState.value.databaseInitStatus === 'idle' || bootstrapState.value.databaseInitStatus === 'initializing')
      return 'initializing'

    if (bootstrapState.value.databaseInitStatus === 'failed')
      return 'failed'

    return bootstrapState.value.authState
  })

  const currentUsername = computed(() => bootstrapState.value?.currentUsername ?? null)
  const initializationErrorMessage = computed(() =>
    bootstrapState.value?.databaseInitError ?? bootstrapTransportError.value,
  )
  const authState = computed<AuthBootstrapState | null>(() =>
    viewState.value === 'authenticated' || viewState.value === 'needsRegistration' || viewState.value === 'requiresLogin'
      ? viewState.value
      : null,
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

  async function register(credentials: AuthCredentialsInput) {
    return runAuthMutation(client => client.auth.register(credentials))
  }

  async function login(credentials: AuthCredentialsInput) {
    return runAuthMutation(client => client.auth.login(credentials))
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
    actionErrorMessage: readonly(actionErrorMessage),
    authState: readonly(authState),
    bootstrapState: readonly(bootstrapState),
    currentUsername: readonly(currentUsername),
    ensureBootstrapped,
    initializationErrorMessage: readonly(initializationErrorMessage),
    isBootstrapping: readonly(isBootstrapping),
    isSubmitting: readonly(isSubmitting),
    login,
    logout,
    refreshBootstrap,
    register,
    retryBootstrap,
    viewState: readonly(viewState),
  }
}
