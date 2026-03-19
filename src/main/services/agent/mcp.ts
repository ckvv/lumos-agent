import type { McpServerRecord } from '#main/database/schema'
import type { McpInspectionSnapshot, McpServerDetail, McpServerSummary, SaveMcpServerInput } from '#shared/agent/types'
import { db } from '#main/database/database'
import { mcpServers } from '#main/database/schema'
import { logger } from '#main/logger'
import { requireAuthenticatedUser } from '#main/services/auth'
import { decryptSecret, encryptSecret, getSecretStorageState } from '#main/services/chat/secure-storage'
import { parseJson, serializeJson } from '#main/services/chat/shared'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ORPCError } from '@orpc/server'
import { eq } from 'drizzle-orm'
import { app } from 'electron'

type ConnectedMcpTransport = StdioClientTransport | StreamableHTTPClientTransport

interface StoredMcpConfig {
  args?: string[]
  command?: string
  cwd?: string | null
  url?: string
}

interface StoredMcpSecret {
  env?: Record<string, string>
  headers?: Record<string, string>
}

interface PersistedSecretPayload {
  encryptedSecret: string | null
  secretStorageMode: McpServerRecord['secretStorageMode']
}

interface McpRuntimeState {
  client: Client
  isConnected: boolean
  lastError: string | null
  snapshot: McpInspectionSnapshot | null
  transport: ConnectedMcpTransport
}

export interface ActiveMcpRegistryEntry {
  client: Client
  detail: McpServerDetail
}

const runtimeEntries = new Map<number, McpRuntimeState>()

let registryInitialized = false
let registryInitializationPromise: Promise<void> | null = null

function ensureAgentAccess() {
  requireAuthenticatedUser()
}

function getClientInfo() {
  return {
    name: app.getName(),
    version: app.getVersion(),
  }
}

function getMcpServerRecord(id: number) {
  return db.select()
    .from(mcpServers)
    .where(eq(mcpServers.id, id))
    .limit(1)
    .get() ?? null
}

function ensureMcpServerRecord(id: number) {
  const record = getMcpServerRecord(id)

  if (!record) {
    throw new ORPCError('NOT_FOUND', {
      message: 'MCP server was not found',
    })
  }

  return record
}

function listMcpServerRecords() {
  return db.select()
    .from(mcpServers)
    .all()
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
}

function parseStoredMcpConfig(record: McpServerRecord) {
  return parseJson<StoredMcpConfig>(record.configJson, {})
}

function parseStoredMcpSecret(record: McpServerRecord) {
  if (!record.encryptedSecret)
    return {}

  return parseJson<StoredMcpSecret>(decryptSecret(record.encryptedSecret), {})
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

function getMcpConnectionErrorMessage(record: McpServerRecord, error: unknown) {
  const fallbackMessage = error instanceof Error ? error.message : 'Failed to connect to MCP server'

  if (record.transport !== 'stdio')
    return fallbackMessage

  const config = parseStoredMcpConfig(record)

  if (!config.command || !isErrnoException(error) || error.code !== 'ENOENT')
    return fallbackMessage

  const availabilityHint = config.command === 'npx'
    ? 'Make sure Node.js/npm is installed and available to GUI apps.'
    : 'Make sure the command is installed and available to GUI apps.'

  return `MCP stdio command "${config.command}" was not found in PATH even after loading the login-shell environment. ${availabilityHint} You can also configure this MCP server with an absolute executable path.`
}

function disconnectRuntimeEntry(id: number) {
  const runtimeState = runtimeEntries.get(id)

  if (!runtimeState)
    return

  runtimeEntries.delete(id)

  void runtimeState.client.close().catch((error) => {
    logger.warn({ err: error, mcpServerId: id }, 'Failed to close MCP client cleanly')
  })
}

async function buildInspectionSnapshot(client: Client): Promise<McpInspectionSnapshot> {
  const checkedAt = new Date().toISOString()
  const serverVersion = client.getServerVersion()

  const [toolsResult, resourcesResult, promptsResult] = await Promise.all([
    client.listTools().catch(() => ({ tools: [] })),
    client.listResources().catch(() => ({ resources: [] })),
    client.listPrompts().catch(() => ({ prompts: [] })),
  ])

  return {
    capabilities: client.getServerCapabilities()
      ? structuredClone(client.getServerCapabilities() as Record<string, unknown>)
      : null,
    checkedAt,
    prompts: promptsResult.prompts.map(prompt => ({
      arguments: (prompt.arguments ?? []).map(argument => ({
        description: argument.description ?? null,
        name: argument.name,
        required: argument.required ?? false,
      })),
      description: prompt.description ?? '',
      name: prompt.name,
    })),
    resources: resourcesResult.resources.map(resource => ({
      description: resource.description ?? null,
      mimeType: resource.mimeType ?? null,
      name: resource.name,
      uri: resource.uri,
    })),
    serverName: serverVersion?.name ?? null,
    serverVersion: serverVersion?.version ?? null,
    tools: toolsResult.tools.map(tool => ({
      description: tool.description ?? '',
      inputSchema: tool.inputSchema ? structuredClone(tool.inputSchema as Record<string, unknown>) : null,
      name: tool.name,
    })),
  }
}

function buildTransport(record: McpServerRecord): ConnectedMcpTransport {
  const config = parseStoredMcpConfig(record)
  const secret = parseStoredMcpSecret(record)

  if (record.transport === 'stdio') {
    if (!config.command) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'MCP stdio server is missing its command',
      })
    }

    return new StdioClientTransport({
      args: config.args ?? [],
      command: config.command,
      cwd: config.cwd ?? undefined,
      env: secret.env,
      stderr: 'pipe',
    })
  }

  if (!config.url) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'MCP HTTP server is missing its URL',
    })
  }

  return new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: {
      headers: secret.headers,
    },
  })
}

async function connectRuntimeEntry(record: McpServerRecord) {
  disconnectRuntimeEntry(record.id)

  const client = new Client(getClientInfo(), {
    capabilities: {},
  })
  const transport = buildTransport(record)

  try {
    await client.connect(transport)
    const snapshot = await buildInspectionSnapshot(client)

    runtimeEntries.set(record.id, {
      client,
      isConnected: true,
      lastError: null,
      snapshot,
      transport,
    })

    db.update(mcpServers)
      .set({
        lastCheckedAt: snapshot.checkedAt,
        lastError: null,
        lastSnapshotJson: serializeJson(snapshot),
      })
      .where(eq(mcpServers.id, record.id))
      .run()

    return snapshot
  }
  catch (error) {
    const errorMessage = getMcpConnectionErrorMessage(record, error)
    runtimeEntries.set(record.id, {
      client,
      isConnected: false,
      lastError: errorMessage,
      snapshot: null,
      transport,
    })

    db.update(mcpServers)
      .set({
        lastCheckedAt: new Date().toISOString(),
        lastError: errorMessage,
      })
      .where(eq(mcpServers.id, record.id))
      .run()

    try {
      await client.close()
    }
    catch {
    }

    logger.warn({ err: error, mcpServerId: record.id }, 'Failed to connect MCP server')
    throw error
  }
}

async function ensureRegistryInitialized() {
  if (registryInitialized)
    return

  if (registryInitializationPromise)
    return registryInitializationPromise

  registryInitializationPromise = Promise.resolve().then(async () => {
    const enabledRecords = listMcpServerRecords().filter(record => record.isEnabled)

    for (const record of enabledRecords) {
      try {
        await connectRuntimeEntry(record)
      }
      catch {
      }
    }

    registryInitialized = true
  }).finally(() => {
    registryInitializationPromise = null
  })

  return registryInitializationPromise
}

function getMcpSummary(record: McpServerRecord): McpServerSummary {
  const runtimeState = runtimeEntries.get(record.id)
  const snapshot = runtimeState?.snapshot
    ?? parseJson<McpInspectionSnapshot | null>(record.lastSnapshotJson, null)

  return {
    displayName: record.displayName,
    id: record.id,
    isEnabled: record.isEnabled,
    isReachable: runtimeState?.isConnected ?? false,
    lastCheckedAt: record.lastCheckedAt,
    lastError: runtimeState?.lastError ?? record.lastError,
    serverName: snapshot?.serverName ?? null,
    serverVersion: snapshot?.serverVersion ?? null,
    transport: record.transport as McpServerSummary['transport'],
  }
}

function getMcpDetail(record: McpServerRecord): McpServerDetail {
  const config = parseStoredMcpConfig(record)
  const secret = parseStoredMcpSecret(record)
  const summary = getMcpSummary(record)
  const runtimeState = runtimeEntries.get(record.id)
  const inspectResult = runtimeState?.snapshot
    ?? parseJson<McpInspectionSnapshot | null>(record.lastSnapshotJson, null)

  return {
    ...summary,
    args: config.args ?? [],
    command: config.command ?? null,
    createdAt: record.createdAt,
    cwd: config.cwd ?? null,
    envKeys: Object.keys(secret.env ?? {}).sort((left, right) => left.localeCompare(right)),
    headerKeys: Object.keys(secret.headers ?? {}).sort((left, right) => left.localeCompare(right)),
    inspectResult,
    updatedAt: record.updatedAt,
    url: config.url ?? null,
  }
}

function getDefaultSecretStorageMode() {
  return getSecretStorageState().available ? 'safeStorage' : 'plainText'
}

function persistMcpSecret(secret: StoredMcpSecret | undefined, previousRecord: McpServerRecord | null): PersistedSecretPayload {
  if (secret === undefined) {
    return {
      encryptedSecret: previousRecord?.encryptedSecret ?? null,
      secretStorageMode: previousRecord?.secretStorageMode ?? getDefaultSecretStorageMode(),
    }
  }

  const hasSecret = Object.keys(secret.env ?? {}).length > 0 || Object.keys(secret.headers ?? {}).length > 0

  if (!hasSecret) {
    return {
      encryptedSecret: null,
      secretStorageMode: getDefaultSecretStorageMode(),
    }
  }

  const encryptedPayload = encryptSecret(serializeJson(secret))
  return {
    encryptedSecret: encryptedPayload.value,
    secretStorageMode: encryptedPayload.mode,
  }
}

function normalizeSaveMcpPayload(input: SaveMcpServerInput) {
  if (input.transport === 'stdio') {
    return {
      config: {
        args: input.args ?? [],
        command: input.command.trim(),
        cwd: input.cwd?.trim() || null,
      } satisfies StoredMcpConfig,
      secret: input.env
        ? {
          env: input.env,
        } satisfies StoredMcpSecret
        : undefined,
    }
  }

  return {
    config: {
      url: input.url.trim(),
    } satisfies StoredMcpConfig,
    secret: input.headers
      ? {
        headers: input.headers,
      } satisfies StoredMcpSecret
      : undefined,
  }
}

export async function listManagedMcpServers() {
  ensureAgentAccess()
  await ensureRegistryInitialized()

  return listMcpServerRecords().map(record => getMcpSummary(record))
}

export async function getManagedMcpServerDetail(id: number) {
  ensureAgentAccess()
  await ensureRegistryInitialized()
  return getMcpDetail(ensureMcpServerRecord(id))
}

export async function saveManagedMcpServer(input: SaveMcpServerInput) {
  ensureAgentAccess()
  await ensureRegistryInitialized()

  const previousRecord = input.id ? getMcpServerRecord(input.id) : null
  const normalizedPayload = normalizeSaveMcpPayload(input)
  const reusableSecretRecord = previousRecord?.transport === input.transport ? previousRecord : null
  const secretPayload = persistMcpSecret(normalizedPayload.secret, reusableSecretRecord)
  const now = new Date().toISOString()

  if (previousRecord) {
    disconnectRuntimeEntry(previousRecord.id)

    db.update(mcpServers)
      .set({
        configJson: serializeJson(normalizedPayload.config),
        displayName: input.displayName.trim(),
        encryptedSecret: secretPayload.encryptedSecret,
        lastError: null,
        lastSnapshotJson: null,
        secretStorageMode: secretPayload.secretStorageMode,
        transport: input.transport,
        updatedAt: now,
      })
      .where(eq(mcpServers.id, previousRecord.id))
      .run()
  }
  else {
    const result = db.insert(mcpServers)
      .values({
        configJson: serializeJson(normalizedPayload.config),
        createdAt: now,
        displayName: input.displayName.trim(),
        encryptedSecret: secretPayload.encryptedSecret,
        isEnabled: false,
        lastCheckedAt: null,
        lastError: null,
        lastSnapshotJson: null,
        secretStorageMode: secretPayload.secretStorageMode,
        transport: input.transport,
        updatedAt: now,
      })
      .run()

    input = {
      ...input,
      id: Number(result.lastInsertRowid),
    }
  }

  const savedRecord = input.id ? ensureMcpServerRecord(input.id) : null

  if (!savedRecord) {
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message: 'Failed to persist MCP server',
    })
  }

  if (savedRecord.isEnabled) {
    try {
      await connectRuntimeEntry(savedRecord)
    }
    catch {
    }
  }

  return getMcpDetail(savedRecord)
}

export async function inspectManagedMcpServer(id: number) {
  ensureAgentAccess()
  await ensureRegistryInitialized()

  const record = ensureMcpServerRecord(id)
  await connectRuntimeEntry(record)

  return getMcpDetail(ensureMcpServerRecord(id))
}

export async function setManagedMcpServerEnabled(id: number, isEnabled: boolean) {
  ensureAgentAccess()
  await ensureRegistryInitialized()

  const record = ensureMcpServerRecord(id)
  db.update(mcpServers)
    .set({
      isEnabled,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(mcpServers.id, record.id))
    .run()

  const updatedRecord = ensureMcpServerRecord(id)

  if (isEnabled) {
    try {
      await connectRuntimeEntry(updatedRecord)
    }
    catch {
    }
  }
  else {
    disconnectRuntimeEntry(id)
  }

  return getMcpDetail(updatedRecord)
}

export async function deleteManagedMcpServer(id: number) {
  ensureAgentAccess()
  await ensureRegistryInitialized()
  ensureMcpServerRecord(id)
  disconnectRuntimeEntry(id)

  db.delete(mcpServers)
    .where(eq(mcpServers.id, id))
    .run()
}

export async function getActiveMcpRegistry() {
  ensureAgentAccess()
  await ensureRegistryInitialized()

  const activeRecords = listMcpServerRecords().filter(record => record.isEnabled)
  const activeEntries: ActiveMcpRegistryEntry[] = []

  for (const record of activeRecords) {
    let runtimeState = runtimeEntries.get(record.id)

    if (!runtimeState?.isConnected) {
      try {
        await connectRuntimeEntry(record)
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect MCP server'
        throw new ORPCError('BAD_GATEWAY', {
          message: `MCP server "${record.displayName}" is unavailable: ${errorMessage}`,
        })
      }

      runtimeState = runtimeEntries.get(record.id)
    }

    if (!runtimeState?.isConnected) {
      throw new ORPCError('BAD_GATEWAY', {
        message: `MCP server "${record.displayName}" is unavailable`,
      })
    }

    activeEntries.push({
      client: runtimeState.client,
      detail: getMcpDetail(ensureMcpServerRecord(record.id)),
    })
  }

  return activeEntries
}
