import type { AppBootstrap, AppRecommendedRoute } from '#shared/app/types'
import { getDatabaseBootstrapSnapshot, startDatabaseBootstrapInBackground } from '#main/database/bootstrap'
import { getAuthSessionSnapshot } from '#main/services/auth'
import { getConversationCount, getLatestConversationId } from '#main/services/chat/conversations'
import { getProviderSummary } from '#main/services/chat/providers'
import { buildCapabilityFlags } from '#main/services/chat/shared'

function getUnavailableBootstrap(): AppBootstrap {
  const databaseSnapshot = getDatabaseBootstrapSnapshot()

  return {
    auth: {
      currentUsername: null,
      hasUser: false,
      isAuthenticated: false,
      state: 'requiresLogin',
    },
    capabilityFlags: buildCapabilityFlags(),
    chatSummary: {
      conversationCount: 0,
      latestConversationId: null,
    },
    database: {
      errorMessage: databaseSnapshot.errorMessage,
      status: databaseSnapshot.status,
    },
    providerSummary: {
      apiKeyProviderCount: 0,
      compatibleProviderCount: 0,
      configuredCount: 0,
      hasUsableProvider: false,
      oauthProviderCount: 0,
      secureStorageAvailable: false,
      secureStorageSupported: false,
      usesPlaintextFallback: false,
    },
    routing: {
      canAccessChat: false,
      recommendedRoute: '/auth',
      shouldRedirectToProviderSettings: false,
    },
  }
}

function buildRecommendedRoute(isAuthenticated: boolean, hasUsableProvider: boolean): AppRecommendedRoute {
  if (!isAuthenticated)
    return '/auth'

  if (!hasUsableProvider)
    return '/settings/providers'

  return '/chat'
}

export function getAppBootstrap(): AppBootstrap {
  let databaseSnapshot = getDatabaseBootstrapSnapshot()

  if (databaseSnapshot.status === 'idle' || databaseSnapshot.status === 'failed') {
    startDatabaseBootstrapInBackground()
    databaseSnapshot = getDatabaseBootstrapSnapshot()
  }

  if (databaseSnapshot.status !== 'ready')
    return getUnavailableBootstrap()

  const authSnapshot = getAuthSessionSnapshot()
  const providerSummary = getProviderSummary()
  const capabilityFlags = buildCapabilityFlags()
  const recommendedRoute = buildRecommendedRoute(authSnapshot.isAuthenticated, providerSummary.hasUsableProvider)

  return {
    auth: authSnapshot,
    capabilityFlags,
    chatSummary: authSnapshot.isAuthenticated
      ? {
          conversationCount: getConversationCount(),
          latestConversationId: getLatestConversationId(),
        }
      : {
          conversationCount: 0,
          latestConversationId: null,
        },
    database: {
      errorMessage: databaseSnapshot.errorMessage,
      status: databaseSnapshot.status,
    },
    providerSummary,
    routing: {
      canAccessChat: authSnapshot.isAuthenticated && providerSummary.hasUsableProvider,
      recommendedRoute,
      shouldRedirectToProviderSettings: authSnapshot.isAuthenticated && !providerSummary.hasUsableProvider,
    },
  }
}
