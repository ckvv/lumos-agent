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

export const providerConfigs = sqliteTable('provider_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: text('provider_id').notNull(),
  displayName: text('display_name').notNull(),
  kind: text('kind').notNull(),
  authMode: text('auth_mode').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  baseUrl: text('base_url'),
  encryptedSecret: text('encrypted_secret'),
  compatJson: text('compat_json'),
  secretStorageMode: text('secret_storage_mode').notNull(),
  lastSyncError: text('last_sync_error'),
  ...auditColumns,
})

export const providerModels = sqliteTable('provider_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerConfigId: integer('provider_config_id').notNull().references(() => providerConfigs.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  name: text('name').notNull(),
  api: text('api').notNull(),
  reasoning: integer('reasoning', { mode: 'boolean' }).notNull().default(false),
  inputJson: text('input_json').notNull(),
  contextWindow: integer('context_window').notNull(),
  maxTokens: integer('max_tokens').notNull(),
  costJson: text('cost_json').notNull(),
  origin: text('origin').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  ...auditColumns,
})

export const conversations = sqliteTable('conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  runtimeConfigJson: text('runtime_config_json').notNull(),
  lastMessagePreview: text('last_message_preview'),
  lastMessageAt: text('last_message_at'),
  ...auditColumns,
})

export const mcpServers = sqliteTable('mcp_servers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  transport: text('transport').notNull(),
  configJson: text('config_json').notNull(),
  encryptedSecret: text('encrypted_secret'),
  secretStorageMode: text('secret_storage_mode').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  lastCheckedAt: text('last_checked_at'),
  lastError: text('last_error'),
  lastSnapshotJson: text('last_snapshot_json'),
  ...auditColumns,
})

export const managedSkills = sqliteTable('managed_skills', {
  id: text('id').primaryKey(),
  filePath: text('file_path').notNull(),
  skillName: text('skill_name').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  ...auditColumns,
})

export const conversationMessages = sqliteTable('conversation_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  role: text('role').notNull(),
  messageJson: text('message_json').notNull(),
  invocationMetadataJson: text('invocation_metadata_json'),
  runtimeSnapshotJson: text('runtime_snapshot_json'),
  ...auditColumns,
})

export const databaseSchema = {
  conversationMessages,
  conversations,
  managedSkills,
  mcpServers,
  providerConfigs,
  providerModels,
  sessions,
  users,
}

export type ProviderConfigRecord = typeof providerConfigs.$inferSelect
export type ProviderModelRecord = typeof providerModels.$inferSelect
export type ConversationRecord = typeof conversations.$inferSelect
export type ConversationMessageRecord = typeof conversationMessages.$inferSelect
export type McpServerRecord = typeof mcpServers.$inferSelect
export type ManagedSkillRecord = typeof managedSkills.$inferSelect
export type UserRecord = typeof users.$inferSelect
export type SessionRecord = typeof sessions.$inferSelect
