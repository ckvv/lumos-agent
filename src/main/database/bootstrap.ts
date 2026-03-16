import type { DatabaseInitStatus } from '#shared/auth/types'
import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { logger } from '#main/logger'
import { drizzle } from 'drizzle-orm/node-sqlite'
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

function initializeSchema(client: DatabaseSync) {
  client.exec('PRAGMA foreign_keys = ON;')
  client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      is_authenticated INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `)
}

function createDatabaseContext() {
  const filePath = getDatabaseFilePath()
  mkdirSync(path.dirname(filePath), { recursive: true })

  const client = new DatabaseSync(filePath)

  try {
    initializeSchema(client)

    return {
      client,
      db: drizzle({ client, schema: databaseSchema }),
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
