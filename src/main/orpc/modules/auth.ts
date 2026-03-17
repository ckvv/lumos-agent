import { getAppBootstrap } from '#main/services/app'
import {
  loginLocalUser,
  logoutLocalUser,
  registerLocalUser,
} from '#main/services/auth'
import { os } from '@orpc/server'
import { z } from 'zod'

const appBootstrapSchema = z.object({
  auth: z.object({
    currentUsername: z.string().nullable(),
    hasUser: z.boolean(),
    isAuthenticated: z.boolean(),
    state: z.enum(['needsRegistration', 'requiresLogin', 'authenticated']),
  }),
  capabilityFlags: z.object({
    mcp: z.boolean(),
    skills: z.boolean(),
    tools: z.boolean(),
  }),
  chatSummary: z.object({
    conversationCount: z.number().int().min(0),
    latestConversationId: z.number().int().nullable(),
  }),
  database: z.object({
    errorMessage: z.string().nullable(),
    status: z.enum(['idle', 'initializing', 'ready', 'failed']),
  }),
  providerSummary: z.object({
    apiKeyProviderCount: z.number().int().min(0),
    compatibleProviderCount: z.number().int().min(0),
    configuredCount: z.number().int().min(0),
    hasUsableProvider: z.boolean(),
    oauthProviderCount: z.number().int().min(0),
    secureStorageAvailable: z.boolean(),
    secureStorageSupported: z.boolean(),
    usesPlaintextFallback: z.boolean(),
  }),
  routing: z.object({
    canAccessChat: z.boolean(),
    recommendedRoute: z.enum(['/', '/auth', '/chat', '/settings/providers']),
    shouldRedirectToProviderSettings: z.boolean(),
  }),
})

const authCredentialsInputSchema = z.object({
  password: z.string().min(1),
  username: z.string().trim().min(1),
})

export const authRouter = {
  login: os.input(authCredentialsInputSchema).output(appBootstrapSchema).handler(async ({ input }) => {
    await loginLocalUser(input)
    return getAppBootstrap()
  }),
  logout: os.output(appBootstrapSchema).handler(() => {
    logoutLocalUser()
    return getAppBootstrap()
  }),
  register: os.input(authCredentialsInputSchema).output(appBootstrapSchema).handler(async ({ input }) => {
    await registerLocalUser(input)
    return getAppBootstrap()
  }),
}
