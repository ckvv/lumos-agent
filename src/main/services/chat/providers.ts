import type { ProviderConfigRecord } from '#main/database/schema'
import type { AppBootstrapProviderSummary } from '#shared/app/types'
import type {
  CompatibleProviderCompat,
  OAuthProviderOption,
  ProviderConfigDetail,
  ProviderModelOption,
  SecretStorageMode,
} from '#shared/chat/types'
import type {
  Api,
  Model,
} from '@mariozechner/pi-ai'
import type {
  OAuthCredentials,
  OAuthProviderInterface,
} from '@mariozechner/pi-ai/oauth'
import { db } from '#main/database/database'
import { providerConfigs, providerModels } from '#main/database/schema'
import { createOAuthEventQueue, createOAuthManualCodeSession, openOAuthUrl, submitOAuthManualCode as submitOAuthManualCodeValue } from '#main/services/chat/oauth-login'
import { decryptSecret, encryptSecret, getSecretStorageState } from '#main/services/chat/secure-storage'
import { getBuiltinModels, parseCompatibleCompat, parseJson, serializeJson, toProviderModelOption } from '#main/services/chat/shared'
import { getOAuthApiKey, getOAuthProvider, getOAuthProviders } from '@mariozechner/pi-ai/oauth'
import { ORPCError } from '@orpc/server'
import { and, eq } from 'drizzle-orm'

const BUILTIN_API_KEY_PROVIDERS = [
  {
    displayName: 'OpenAI',
    providerId: 'openai',
  },
  {
    displayName: 'Anthropic',
    providerId: 'anthropic',
  },
  {
    displayName: 'Google',
    providerId: 'google',
  },
] as const

const DEFAULT_DISCOVERED_MODEL_CONTEXT_WINDOW = 131072
const DEFAULT_DISCOVERED_MODEL_MAX_TOKENS = 32768
const TRAILING_SLASHES_RE = /\/+$/

export interface CompatibleModelDraftInput {
  contextWindow: number
  maxTokens: number
  modelId: string
  name: string
  providerConfigId: number
  reasoning: boolean
  supportsImageInput: boolean
}

export interface SaveCompatibleProviderInput {
  apiKey?: string
  baseUrl: string
  compat: CompatibleProviderCompat | null
  displayName: string
  id?: number
}

export interface SaveBuiltinApiKeyProviderInput {
  apiKey: string
  providerId: string
}

export interface ResolvedProviderRuntime {
  apiKey: string
  config: ProviderConfigDetail
  model: Model<Api>
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(TRAILING_SLASHES_RE, '')
}

function getBuiltinApiKeyProvider(providerId: string) {
  return BUILTIN_API_KEY_PROVIDERS.find(provider => provider.providerId === providerId) ?? null
}

function getOAuthProviderOptionsInternal() {
  return getOAuthProviders()
    .map(provider => ({
      id: provider.id,
      name: provider.name,
      usesCallbackServer: Boolean(provider.usesCallbackServer),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function findProviderConfigRecordById(id: number) {
  return db.select().from(providerConfigs).where(eq(providerConfigs.id, id)).limit(1).get() ?? null
}

function findBuiltinConfigRecord(providerId: string, authMode: 'apiKey' | 'oauth') {
  return db.select()
    .from(providerConfigs)
    .where(and(
      eq(providerConfigs.providerId, providerId),
      eq(providerConfigs.kind, 'builtin'),
      eq(providerConfigs.authMode, authMode),
    ))
    .limit(1)
    .get() ?? null
}

function getCompatibleModelRecords(providerConfigId: number) {
  return db.select()
    .from(providerModels)
    .where(eq(providerModels.providerConfigId, providerConfigId))
    .all()
}

function parseStoredOAuthCredentials(record: ProviderConfigRecord) {
  if (!record.encryptedSecret)
    return null

  return parseJson<OAuthCredentials | null>(decryptSecret(record.encryptedSecret), null)
}

function parseStoredApiKey(record: ProviderConfigRecord) {
  if (!record.encryptedSecret)
    return null

  return decryptSecret(record.encryptedSecret)
}

function getProviderModelOptions(record: ProviderConfigRecord) {
  if (record.kind === 'openaiCompatible') {
    return getCompatibleModelRecords(record.id)
      .filter(model => model.isEnabled)
      .map<ProviderModelOption>(model => ({
        api: model.api,
        contextWindow: model.contextWindow,
        cost: parseJson(model.costJson, {
          cacheRead: 0,
          cacheWrite: 0,
          input: 0,
          output: 0,
        }),
        id: model.modelId,
        input: parseJson<Array<'image' | 'text'>>(model.inputJson, ['text']),
        maxTokens: model.maxTokens,
        name: model.name,
        origin: model.origin as ProviderModelOption['origin'],
        reasoning: model.reasoning,
      }))
  }

  const oauthProvider = record.authMode === 'oauth' ? getOAuthProvider(record.providerId) : undefined
  const oauthCredentials = record.authMode === 'oauth' ? parseStoredOAuthCredentials(record) : null
  const builtinModels = getBuiltinModels(record.providerId)
  const resolvedModels = oauthProvider?.modifyModels && oauthCredentials
    ? oauthProvider.modifyModels(builtinModels, oauthCredentials)
    : builtinModels

  return resolvedModels.map(model => toProviderModelOption(model, 'builtin'))
}

function isProviderConfigUsable(record: ProviderConfigRecord, models: ProviderModelOption[]) {
  return record.isEnabled && Boolean(record.encryptedSecret) && models.length > 0
}

function mapProviderConfigDetail(record: ProviderConfigRecord): ProviderConfigDetail {
  const models = getProviderModelOptions(record)
  const oauthProvider = record.authMode === 'oauth' ? getOAuthProvider(record.providerId) : undefined

  return {
    authMode: record.authMode as ProviderConfigDetail['authMode'],
    baseUrl: record.baseUrl,
    compat: parseCompatibleCompat(record.compatJson),
    createdAt: record.createdAt,
    displayName: record.displayName,
    hasCredentials: Boolean(record.encryptedSecret),
    id: record.id,
    isEnabled: record.isEnabled,
    isUsable: isProviderConfigUsable(record, models),
    kind: record.kind as ProviderConfigDetail['kind'],
    lastSyncError: record.lastSyncError,
    models,
    oauthProviderName: oauthProvider?.name ?? null,
    providerId: record.providerId,
    secretStorageMode: record.secretStorageMode as SecretStorageMode,
    updatedAt: record.updatedAt,
  }
}

function ensureProviderConfigRecord(id: number) {
  const record = findProviderConfigRecordById(id)

  if (!record) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Provider configuration was not found',
    })
  }

  return record
}

function saveProviderConfigRecord(payload: Omit<typeof providerConfigs.$inferInsert, 'id'>, existingRecordId?: number) {
  if (existingRecordId) {
    db.update(providerConfigs)
      .set(payload)
      .where(eq(providerConfigs.id, existingRecordId))
      .run()

    return ensureProviderConfigRecord(existingRecordId)
  }

  const result = db.insert(providerConfigs)
    .values(payload)
    .run()

  return ensureProviderConfigRecord(Number(result.lastInsertRowid))
}

function buildCompatibleDiscoveredModel(modelId: string) {
  return {
    api: 'openai-completions',
    contextWindow: DEFAULT_DISCOVERED_MODEL_CONTEXT_WINDOW,
    costJson: serializeJson({
      cacheRead: 0,
      cacheWrite: 0,
      input: 0,
      output: 0,
    }),
    inputJson: serializeJson(['text'] satisfies Array<'text' | 'image'>),
    isEnabled: true,
    maxTokens: DEFAULT_DISCOVERED_MODEL_MAX_TOKENS,
    modelId,
    name: modelId,
    origin: 'discovered',
    reasoning: false,
  }
}

async function fetchCompatibleModelIds(record: ProviderConfigRecord, apiKey: string) {
  const baseUrl = normalizeBaseUrl(record.baseUrl ?? '')

  if (!baseUrl) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'OpenAI-compatible providers require a base URL',
    })
  }

  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new ORPCError('BAD_GATEWAY', {
      message: `Model discovery failed with HTTP ${response.status}`,
    })
  }

  const payload = await response.json() as { data?: Array<{ id?: string }> }

  return (payload.data ?? [])
    .map(item => item.id?.trim() ?? '')
    .filter(Boolean)
}

async function persistOAuthCredentials(provider: OAuthProviderInterface, credentials: OAuthCredentials) {
  const encryptedSecret = encryptSecret(serializeJson(credentials))
  const existingRecord = findBuiltinConfigRecord(provider.id, 'oauth')

  const record = saveProviderConfigRecord({
    authMode: 'oauth',
    baseUrl: null,
    compatJson: null,
    displayName: provider.name,
    encryptedSecret: encryptedSecret.value,
    isEnabled: true,
    kind: 'builtin',
    lastSyncError: null,
    providerId: provider.id,
    secretStorageMode: encryptedSecret.mode,
  }, existingRecord?.id)

  return mapProviderConfigDetail(record)
}

async function resolveBuiltinOAuthApiKey(record: ProviderConfigRecord) {
  const oauthCredentials = parseStoredOAuthCredentials(record)

  if (!oauthCredentials) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'OAuth credentials are missing for this provider',
    })
  }

  const result = await getOAuthApiKey(record.providerId, {
    [record.providerId]: oauthCredentials,
  })

  if (!result) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'OAuth login is required before using this provider',
    })
  }

  const encryptedSecret = encryptSecret(serializeJson(result.newCredentials))

  db.update(providerConfigs)
    .set({
      encryptedSecret: encryptedSecret.value,
      secretStorageMode: encryptedSecret.mode,
    })
    .where(eq(providerConfigs.id, record.id))
    .run()

  return result.apiKey
}

export function listProviderConfigs() {
  return db.select()
    .from(providerConfigs)
    .all()
    .map(mapProviderConfigDetail)
}

export function listOAuthProviders(): OAuthProviderOption[] {
  return getOAuthProviderOptionsInternal()
}

export function getProviderSummary(): AppBootstrapProviderSummary {
  const configs = listProviderConfigs()
  const secureStorageState = getSecretStorageState()

  return {
    apiKeyProviderCount: configs.filter(config => config.authMode === 'apiKey').length,
    compatibleProviderCount: configs.filter(config => config.kind === 'openaiCompatible').length,
    configuredCount: configs.length,
    hasUsableProvider: configs.some(config => config.isUsable),
    oauthProviderCount: configs.filter(config => config.authMode === 'oauth').length,
    secureStorageAvailable: secureStorageState.available,
    secureStorageSupported: secureStorageState.supported,
    usesPlaintextFallback: configs.some(config => config.secretStorageMode === 'plainText'),
  }
}

export function saveBuiltinApiKeyProviderConfig(input: SaveBuiltinApiKeyProviderInput) {
  const provider = getBuiltinApiKeyProvider(input.providerId)

  if (!provider) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Unsupported API key provider',
    })
  }

  const encryptedSecret = encryptSecret(input.apiKey.trim())
  const existingRecord = findBuiltinConfigRecord(provider.providerId, 'apiKey')

  return mapProviderConfigDetail(saveProviderConfigRecord({
    authMode: 'apiKey',
    baseUrl: null,
    compatJson: null,
    displayName: provider.displayName,
    encryptedSecret: encryptedSecret.value,
    isEnabled: true,
    kind: 'builtin',
    lastSyncError: null,
    providerId: provider.providerId,
    secretStorageMode: encryptedSecret.mode,
  }, existingRecord?.id))
}

export function saveCompatibleProviderConfig(input: SaveCompatibleProviderInput) {
  const normalizedBaseUrl = normalizeBaseUrl(input.baseUrl)

  if (!normalizedBaseUrl) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Base URL is required',
    })
  }

  const existingRecord = input.id ? ensureProviderConfigRecord(input.id) : null
  const secretValue = input.apiKey?.trim()
  const encryptedSecret = secretValue
    ? encryptSecret(secretValue)
    : existingRecord && existingRecord.encryptedSecret
      ? {
          mode: existingRecord.secretStorageMode as SecretStorageMode,
          value: existingRecord.encryptedSecret,
        }
      : null

  if (!encryptedSecret) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'OpenAI-compatible providers require an API key',
    })
  }

  const record = saveProviderConfigRecord({
    authMode: 'apiKey',
    baseUrl: normalizedBaseUrl,
    compatJson: serializeJson(input.compat),
    displayName: input.displayName.trim() || normalizedBaseUrl,
    encryptedSecret: encryptedSecret.value,
    isEnabled: existingRecord?.isEnabled ?? true,
    kind: 'openaiCompatible',
    lastSyncError: null,
    providerId: 'openai-compatible',
    secretStorageMode: encryptedSecret.mode,
  }, existingRecord?.id)

  return mapProviderConfigDetail(record)
}

export function deleteProviderConfig(id: number) {
  ensureProviderConfigRecord(id)

  db.delete(providerConfigs)
    .where(eq(providerConfigs.id, id))
    .run()
}

export function setProviderConfigEnabled(id: number, isEnabled: boolean) {
  ensureProviderConfigRecord(id)

  db.update(providerConfigs)
    .set({ isEnabled })
    .where(eq(providerConfigs.id, id))
    .run()

  return mapProviderConfigDetail(ensureProviderConfigRecord(id))
}

export async function syncCompatibleProviderModels(providerConfigId: number) {
  const record = ensureProviderConfigRecord(providerConfigId)

  if (record.kind !== 'openaiCompatible') {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Only OpenAI-compatible providers support model discovery',
    })
  }

  const apiKey = parseStoredApiKey(record)

  if (!apiKey) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'This provider does not have an API key yet',
    })
  }

  try {
    const discoveredModelIds = await fetchCompatibleModelIds(record, apiKey)
    const existingModels = getCompatibleModelRecords(record.id)

    for (const modelId of discoveredModelIds) {
      const existingRecord = existingModels.find(model => model.modelId === modelId)

      if (existingRecord) {
        if (existingRecord.origin === 'manual')
          continue

        db.update(providerModels)
          .set({
            isEnabled: true,
            name: modelId,
            origin: 'discovered',
          })
          .where(eq(providerModels.id, existingRecord.id))
          .run()

        continue
      }

      db.insert(providerModels)
        .values({
          ...buildCompatibleDiscoveredModel(modelId),
          providerConfigId: record.id,
        })
        .run()
    }

    db.update(providerConfigs)
      .set({ lastSyncError: null })
      .where(eq(providerConfigs.id, record.id))
      .run()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown model discovery error'

    db.update(providerConfigs)
      .set({ lastSyncError: message })
      .where(eq(providerConfigs.id, record.id))
      .run()

    throw error
  }

  return mapProviderConfigDetail(ensureProviderConfigRecord(record.id))
}

export function saveCompatibleModel(input: CompatibleModelDraftInput) {
  const providerConfig = ensureProviderConfigRecord(input.providerConfigId)

  if (providerConfig.kind !== 'openaiCompatible') {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Manual models are only available for OpenAI-compatible providers',
    })
  }

  const existingModel = getCompatibleModelRecords(providerConfig.id)
    .find(model => model.modelId === input.modelId)

  const payload = {
    api: 'openai-completions',
    contextWindow: input.contextWindow,
    costJson: serializeJson({
      cacheRead: 0,
      cacheWrite: 0,
      input: 0,
      output: 0,
    }),
    inputJson: serializeJson(
      (input.supportsImageInput ? ['text', 'image'] : ['text']) satisfies Array<'image' | 'text'>,
    ),
    isEnabled: true,
    maxTokens: input.maxTokens,
    modelId: input.modelId.trim(),
    name: input.name.trim() || input.modelId.trim(),
    origin: 'manual',
    reasoning: input.reasoning,
  }

  if (existingModel) {
    db.update(providerModels)
      .set(payload)
      .where(eq(providerModels.id, existingModel.id))
      .run()
  }
  else {
    db.insert(providerModels)
      .values({
        ...payload,
        providerConfigId: providerConfig.id,
      })
      .run()
  }

  return mapProviderConfigDetail(ensureProviderConfigRecord(providerConfig.id))
}

export function deleteCompatibleModel(providerConfigId: number, modelId: string) {
  const providerConfig = ensureProviderConfigRecord(providerConfigId)

  if (providerConfig.kind !== 'openaiCompatible') {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Manual models are only available for OpenAI-compatible providers',
    })
  }

  const existingModel = getCompatibleModelRecords(providerConfig.id)
    .find(model => model.modelId === modelId)

  if (!existingModel) {
    throw new ORPCError('NOT_FOUND', {
      message: 'The model does not exist',
    })
  }

  db.delete(providerModels)
    .where(eq(providerModels.id, existingModel.id))
    .run()
}

export function startOAuthLogin(providerId: string, signal?: AbortSignal) {
  const provider = getOAuthProvider(providerId)

  if (!provider) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Unsupported OAuth provider',
    })
  }

  const eventQueue = createOAuthEventQueue()
  const manualCodeSession = createOAuthManualCodeSession(provider.id, signal)

  signal?.addEventListener('abort', () => {
    eventQueue.push({
      message: 'OAuth login was canceled',
      providerId: provider.id,
      sessionId: manualCodeSession.sessionId,
      type: 'canceled',
    })
    eventQueue.end()
  }, { once: true })

  void provider.login({
    onAuth: (info) => {
      eventQueue.push({
        instructions: info.instructions,
        providerId: provider.id,
        sessionId: manualCodeSession.sessionId,
        type: 'auth_url',
        url: info.url,
      })

      void openOAuthUrl(info.url).catch(() => {})
    },
    onManualCodeInput: () => manualCodeSession.promise,
    onProgress: (message) => {
      eventQueue.push({
        message,
        providerId: provider.id,
        sessionId: manualCodeSession.sessionId,
        type: 'progress',
      })
    },
    onPrompt: async (prompt) => {
      eventQueue.push({
        message: prompt.message,
        providerId: provider.id,
        sessionId: manualCodeSession.sessionId,
        type: 'waiting_manual_code',
      })

      return manualCodeSession.promise
    },
    signal,
  }).then(async (credentials) => {
    const config = await persistOAuthCredentials(provider, credentials)

    eventQueue.push({
      config,
      providerId: provider.id,
      sessionId: manualCodeSession.sessionId,
      type: 'success',
    })
    eventQueue.end()
  }).catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown OAuth login error'

    eventQueue.push({
      message,
      providerId: provider.id,
      recoverable: !signal?.aborted,
      sessionId: manualCodeSession.sessionId,
      type: signal?.aborted ? 'canceled' : 'failed',
    })
    eventQueue.end()
  })

  return eventQueue.iterator
}

export function submitOAuthManualCode(sessionId: string, code: string) {
  const submitted = submitOAuthManualCodeValue(sessionId, code.trim())

  if (!submitted) {
    throw new ORPCError('NOT_FOUND', {
      message: 'This OAuth login session has already expired',
    })
  }
}

export async function resolveProviderRuntime(providerConfigId: number, modelId: string): Promise<ResolvedProviderRuntime> {
  const record = ensureProviderConfigRecord(providerConfigId)

  if (!record.isEnabled) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'This provider is currently disabled',
    })
  }

  if (record.kind === 'openaiCompatible') {
    const selectedModel = getCompatibleModelRecords(record.id)
      .find(model => model.modelId === modelId && model.isEnabled)

    const apiKey = parseStoredApiKey(record)

    if (!selectedModel || !apiKey) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This provider is missing a usable model or API key',
      })
    }

    return {
      apiKey,
      config: mapProviderConfigDetail(record),
      model: {
        api: selectedModel.api as Api,
        baseUrl: record.baseUrl ?? '',
        compat: parseCompatibleCompat(record.compatJson) ?? undefined,
        contextWindow: selectedModel.contextWindow,
        cost: parseJson(selectedModel.costJson, {
          cacheRead: 0,
          cacheWrite: 0,
          input: 0,
          output: 0,
        }),
        headers: undefined,
        id: selectedModel.modelId,
        input: parseJson<Array<'image' | 'text'>>(selectedModel.inputJson, ['text']),
        maxTokens: selectedModel.maxTokens,
        name: selectedModel.name,
        provider: `compatible:${record.id}`,
        reasoning: selectedModel.reasoning,
      },
    }
  }

  const rawApiKey = record.authMode === 'oauth'
    ? await resolveBuiltinOAuthApiKey(record)
    : parseStoredApiKey(record)

  if (!rawApiKey) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'This provider does not have valid credentials yet',
    })
  }

  const detail = mapProviderConfigDetail(ensureProviderConfigRecord(record.id))
  const selectedModel = detail.models.find(model => model.id === modelId)

  if (!selectedModel) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'The selected model is not available for this provider',
    })
  }

  const builtinModels = getBuiltinModels(record.providerId)
  const oauthProvider = record.authMode === 'oauth' ? getOAuthProvider(record.providerId) : undefined
  const oauthCredentials = record.authMode === 'oauth'
    ? parseStoredOAuthCredentials(ensureProviderConfigRecord(record.id))
    : null

  const models = oauthProvider?.modifyModels && oauthCredentials
    ? oauthProvider.modifyModels(builtinModels, oauthCredentials)
    : builtinModels

  const runtimeModel = models.find(model => model.id === modelId)

  if (!runtimeModel) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'The selected model could not be resolved',
    })
  }

  return {
    apiKey: rawApiKey,
    config: detail,
    model: runtimeModel,
  }
}
