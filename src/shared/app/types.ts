import type { AuthBootstrapState, DatabaseInitStatus } from '#shared/auth/types'
import type { CapabilityFlags } from '#shared/chat/types'

export type AppRecommendedRoute = '/' | '/auth' | '/chat' | '/settings/providers'

export interface AppBootstrapDatabaseState {
  errorMessage: string | null
  status: DatabaseInitStatus
}

export interface AppBootstrapAuthState {
  currentUsername: string | null
  hasUser: boolean
  isAuthenticated: boolean
  state: AuthBootstrapState
}

export interface AppBootstrapRoutingState {
  canAccessChat: boolean
  recommendedRoute: AppRecommendedRoute
  shouldRedirectToProviderSettings: boolean
}

export interface AppBootstrapProviderSummary {
  apiKeyProviderCount: number
  compatibleProviderCount: number
  configuredCount: number
  hasUsableProvider: boolean
  oauthProviderCount: number
  secureStorageAvailable: boolean
  secureStorageSupported: boolean
  usesPlaintextFallback: boolean
}

export interface AppBootstrapChatSummary {
  conversationCount: number
  latestConversationId: number | null
}

export interface AppBootstrap {
  auth: AppBootstrapAuthState
  capabilityFlags: CapabilityFlags
  chatSummary: AppBootstrapChatSummary
  database: AppBootstrapDatabaseState
  providerSummary: AppBootstrapProviderSummary
  routing: AppBootstrapRoutingState
}
