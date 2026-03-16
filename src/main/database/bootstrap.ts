import type { DatabaseInitStatus } from '#shared/auth/types'
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import { logger } from '#main/logger'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { app } from 'electron'
import { databaseSchema } from './schema'

const DATABASE_FILENAME = 'lumos.sqlite'

export interface DatabaseBootstrapSnapshot {
  errorMessage: string | null
  filePath: string
  status: DatabaseInitStatus
}

export interface DatabaseContext {
  client: DatabaseSync
  db: NodeSQLiteDatabase<typeof databaseSchema>
  filePath: string
}

let databaseContext: DatabaseContext | null = null
let initStatus: DatabaseInitStatus = 'idle'
let initErrorMessage: string | null = null
let bootstrapPromise: Promise<DatabaseContext> | null = null

function getDatabaseFilePath() {
  return path.join(app.getPath('userData'), DATABASE_FILENAME)
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

function initializeDatabase(db: NodeSQLiteDatabase<typeof databaseSchema>, client: DatabaseSync) {
  client.exec('PRAGMA foreign_keys = ON;')
  migrate(db, { migrationsFolder: getMigrationsFolderPath() })
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

export function getDatabaseContext() {
  return databaseContext
}

export function startDatabaseBootstrap() {
  if (databaseContext && initStatus === 'ready')
    return Promise.resolve(databaseContext)

  if (bootstrapPromise)
    return bootstrapPromise

  initStatus = 'initializing'
  initErrorMessage = null

  bootstrapPromise = Promise.resolve().then(() => {
    closeDatabase()
    const context = createDatabaseContext()
    databaseContext = context
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

export function closeDatabase() {
  if (!databaseContext)
    return

  databaseContext.client.close()
  databaseContext = null
}
