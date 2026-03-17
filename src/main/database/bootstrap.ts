import type { DatabaseContext } from '#main/database/database'
import type { DatabaseInitStatus } from '#shared/auth/types'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import { closeDatabase, getDatabaseContext, setDatabaseContext } from '#main/database/database'
import { resolveDatabaseFilePath } from '#main/database/database-paths'
import { logger } from '#main/logger'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { app } from 'electron'
import { databaseSchema } from './schema'

export interface DatabaseBootstrapSnapshot {
  errorMessage: string | null
  filePath: string
  status: DatabaseInitStatus
}

let initStatus: DatabaseInitStatus = 'idle'
let initErrorMessage: string | null = null
let bootstrapPromise: Promise<DatabaseContext> | null = null

function getDatabaseFilePath() {
  return resolveDatabaseFilePath({
    allowEnvOverride: false,
    userDataPath: app.getPath('userData'),
  })
}

function getMigrationsFolderPath() {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, 'drizzle')]
    : [path.join(app.getAppPath(), 'drizzle'), path.join(process.cwd(), 'drizzle')]

  const folderPath = candidates.find(candidate => existsSync(candidate))

  if (folderPath)
    return folderPath

  throw new Error(`Drizzle migrations folder not found. Looked in: ${candidates.join(', ')}`)
}

function initializeDatabase(db: DatabaseContext['db'], client: DatabaseSync) {
  client.exec('PRAGMA foreign_keys = ON;')
  const migrationsFolder = getMigrationsFolderPath()

  migrate(db, { migrationsFolder })
}

function createDatabaseContext() {
  const filePath = getDatabaseFilePath()
  mkdirSync(path.dirname(filePath), { recursive: true })

  const client = new DatabaseSync(filePath)
  const db = drizzle({ client, schema: databaseSchema })

  try {
    initializeDatabase(db, client)

    return {
      client,
      db,
      filePath,
    } satisfies DatabaseContext
  }
  catch (error) {
    client.close()
    throw error
  }
}

export function getDatabaseBootstrapSnapshot(): DatabaseBootstrapSnapshot {
  return {
    errorMessage: initErrorMessage,
    filePath: getDatabaseFilePath(),
    status: initStatus,
  }
}

export function startDatabaseBootstrap() {
  const currentContext = getDatabaseContext()

  if (currentContext && initStatus === 'ready')
    return Promise.resolve(currentContext)

  if (bootstrapPromise)
    return bootstrapPromise

  initStatus = 'initializing'
  initErrorMessage = null

  bootstrapPromise = Promise.resolve().then(() => {
    closeDatabase()
    const context = createDatabaseContext()
    setDatabaseContext(context)
    initStatus = 'ready'
    logger.info({ filePath: context.filePath }, 'SQLite bootstrap completed')
    return context
  }).catch((error) => {
    initStatus = 'failed'
    initErrorMessage = error instanceof Error ? error.message : 'Unknown database bootstrap error'
    logger.error({ err: error }, 'SQLite bootstrap failed')
    throw error
  }).finally(() => {
    bootstrapPromise = null
  })

  return bootstrapPromise
}

export function startDatabaseBootstrapInBackground() {
  void startDatabaseBootstrap().catch(() => {})
}
