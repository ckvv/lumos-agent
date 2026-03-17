import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

function createIsoTimestamp() {
  return new Date().toISOString()
}

const auditColumns = {
  createdAt: text('created_at').notNull().$defaultFn(createIsoTimestamp),
  // `updatedAt` 依赖 Drizzle 运行时自动补值，insert / update 都不需要 service 显式维护。
  updatedAt: text('updated_at').notNull().$onUpdateFn(createIsoTimestamp),
}

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  ...auditColumns,
})

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().unique().references(() => users.id),
  isAuthenticated: integer('is_authenticated', { mode: 'boolean' }).notNull(),
  ...auditColumns,
})

export const databaseSchema = {
  sessions,
  users,
}

export type UserRecord = typeof users.$inferSelect
export type SessionRecord = typeof sessions.$inferSelect
