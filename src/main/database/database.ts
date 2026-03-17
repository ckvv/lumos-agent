import type { NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite'
import type { databaseSchema } from './schema'
import { ORPCError } from '@orpc/server'

export interface DatabaseContext {
  client: import('node:sqlite').DatabaseSync
  db: NodeSQLiteDatabase<typeof databaseSchema>
  filePath: string
}

export type DatabaseExecutor = DatabaseContext['db']

let databaseContext: DatabaseContext | null = null

export function setDatabaseContext(context: DatabaseContext | null) {
  databaseContext = context
}

export function getDatabaseContext() {
  return databaseContext
}

export function getDatabase(): DatabaseExecutor {
  const context = getDatabaseContext()

  if (!context) {
    throw new ORPCError('SERVICE_UNAVAILABLE', {
      message: 'Database is not ready yet',
    })
  }

  return context.db
}

export const db = new Proxy({} as DatabaseExecutor, {
  get(_target, property) {
    const database = getDatabase()
    const value = Reflect.get(database, property)

    return typeof value === 'function' ? value.bind(database) : value
  },
})

export function closeDatabase() {
  if (!databaseContext)
    return

  databaseContext.client.close()
  databaseContext = null
}
