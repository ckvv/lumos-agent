export const databaseInitStatuses = [
  'idle',
  'initializing',
  'ready',
  'failed',
] as const

export type DatabaseInitStatus = (typeof databaseInitStatuses)[number]

export const authBootstrapStates = [
  'needsRegistration',
  'requiresLogin',
  'authenticated',
] as const

export type AuthBootstrapState = (typeof authBootstrapStates)[number]

export interface AuthCredentialsInput {
  username: string
  password: string
}

export interface AuthSessionSnapshot {
  currentUsername: string | null
  hasUser: boolean
  isAuthenticated: boolean
  state: AuthBootstrapState
}
