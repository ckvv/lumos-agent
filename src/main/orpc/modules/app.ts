import process from 'node:process'
import { getAppBootstrap } from '#main/services/app'
import { authBootstrapStates, databaseInitStatuses } from '#shared/auth/types'
import { os } from '@orpc/server'
import { app } from 'electron'
import { z } from 'zod'

const capabilityFlagsSchema = z.object({
  mcp: z.boolean(),
  skills: z.boolean(),
  tools: z.boolean(),
})

const bootstrapSchema = z.object({
  auth: z.object({
    currentUsername: z.string().nullable(),
    hasUser: z.boolean(),
    isAuthenticated: z.boolean(),
    state: z.enum(authBootstrapStates),
  }),
  capabilityFlags: capabilityFlagsSchema,
  chatSummary: z.object({
    conversationCount: z.number().int().min(0),
    latestConversationId: z.number().int().nullable(),
  }),
  database: z.object({
    errorMessage: z.string().nullable(),
    status: z.enum(databaseInitStatuses),
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

export const appRouter = {
  getBootstrap: os.output(bootstrapSchema).handler(() => getAppBootstrap()),
  getInfo: os.handler(() => ({
    chromeVersion: process.versions.chrome,
    electronVersion: process.versions.electron,
    locale: app.getLocale(),
    name: app.getName(),
    nodeVersion: process.versions.node,
    platform: process.platform,
    version: app.getVersion(),
  })),
}
