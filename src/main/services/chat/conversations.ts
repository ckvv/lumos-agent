import type {
  ConversationMessageRecord as ConversationMessageRow,
  ConversationRecord,
} from '#main/database/schema'
import type { ChatInvocationMetadata } from '#shared/agent/types'
import type {
  ChatRuntimeConfig,
  ConversationDetail,
  ConversationMessageRecord,
  ConversationSummary,
} from '#shared/chat/types'
import type { Message } from '@mariozechner/pi-ai'
import { db } from '#main/database/database'
import { conversationMessages, conversations } from '#main/database/schema'
import { requireAuthenticatedUser } from '#main/services/auth'
import {
  buildConversationTitleFromMessage,
  buildDefaultRuntimeConfig,
  compareConversationSummaries,
  getDefaultConversationTitle,
  messageToPreview,
  parseInvocationMetadata,
  parseJson,
  parseRuntimeConfig,
  sanitizeConversationTitle,
  serializeJson,
} from '#main/services/chat/shared'
import { ORPCError } from '@orpc/server'
import { and, desc, eq } from 'drizzle-orm'

function ensureConversationRecord(id: number, userId: number) {
  const record = db.select()
    .from(conversations)
    .where(and(
      eq(conversations.id, id),
      eq(conversations.userId, userId),
    ))
    .limit(1)
    .get() ?? null

  if (!record) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Conversation was not found',
    })
  }

  return record
}

function mapConversationSummary(record: ConversationRecord): ConversationSummary {
  return {
    id: record.id,
    lastMessageAt: record.lastMessageAt,
    lastMessagePreview: record.lastMessagePreview,
    runtimeConfig: parseRuntimeConfig(record.runtimeConfigJson),
    title: record.title,
    updatedAt: record.updatedAt,
  }
}

function mapConversationMessage(record: ConversationMessageRow): ConversationMessageRecord {
  return {
    conversationId: record.conversationId,
    createdAt: record.createdAt,
    id: record.id,
    invocationMetadata: parseInvocationMetadata(record.invocationMetadataJson),
    message: parseJson<Message>(record.messageJson, {
      content: '',
      role: 'user',
      timestamp: Date.now(),
    }),
    role: record.role as Message['role'],
    runtimeSnapshot: record.runtimeSnapshotJson
      ? parseRuntimeConfig(record.runtimeSnapshotJson)
      : null,
    sequence: record.sequence,
  }
}

export function listConversations() {
  const user = requireAuthenticatedUser()

  return db.select()
    .from(conversations)
    .where(eq(conversations.userId, user.id))
    .all()
    .map(mapConversationSummary)
    .sort(compareConversationSummaries)
}

export function getConversationSummary(id: number) {
  const user = requireAuthenticatedUser()
  return mapConversationSummary(ensureConversationRecord(id, user.id))
}

export function createConversation(runtimeConfig: Partial<ChatRuntimeConfig> = {}) {
  const user = requireAuthenticatedUser()
  const result = db.insert(conversations)
    .values({
      lastMessageAt: null,
      lastMessagePreview: null,
      runtimeConfigJson: serializeJson(buildDefaultRuntimeConfig(runtimeConfig)),
      title: getDefaultConversationTitle(),
      userId: user.id,
    })
    .run()

  return getConversationSummary(Number(result.lastInsertRowid))
}

export function renameConversation(id: number, title: string) {
  const user = requireAuthenticatedUser()
  const record = ensureConversationRecord(id, user.id)

  db.update(conversations)
    .set({
      title: sanitizeConversationTitle(title),
    })
    .where(eq(conversations.id, record.id))
    .run()

  return getConversationSummary(record.id)
}

export function deleteConversation(id: number) {
  const user = requireAuthenticatedUser()
  ensureConversationRecord(id, user.id)

  db.delete(conversations)
    .where(and(
      eq(conversations.id, id),
      eq(conversations.userId, user.id),
    ))
    .run()
}

export function updateConversationRuntimeConfig(id: number, runtimeConfig: ChatRuntimeConfig) {
  const user = requireAuthenticatedUser()
  const record = ensureConversationRecord(id, user.id)

  db.update(conversations)
    .set({
      runtimeConfigJson: serializeJson(buildDefaultRuntimeConfig(runtimeConfig)),
    })
    .where(eq(conversations.id, record.id))
    .run()

  return getConversationSummary(record.id)
}

export function getConversationMessages(conversationId: number) {
  const user = requireAuthenticatedUser()
  ensureConversationRecord(conversationId, user.id)

  return db.select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.sequence)
    .all()
    .map(mapConversationMessage)
}

export function getConversationDetail(id: number): ConversationDetail {
  return {
    conversation: getConversationSummary(id),
    messages: getConversationMessages(id),
  }
}

export function getConversationCount() {
  return listConversations().length
}

export function getLatestConversationId() {
  const user = requireAuthenticatedUser()
  const latestConversation = db.select()
    .from(conversations)
    .where(eq(conversations.userId, user.id))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.updatedAt))
    .limit(1)
    .get()

  return latestConversation?.id ?? null
}

export function getNextConversationMessageSequence(conversationId: number) {
  const latestMessage = db.select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(desc(conversationMessages.sequence))
    .limit(1)
    .get()

  return (latestMessage?.sequence ?? 0) + 1
}

export function appendConversationMessage(
  conversationId: number,
  message: Message,
  runtimeSnapshot: ChatRuntimeConfig | null,
  invocationMetadata: ChatInvocationMetadata | null = null,
) {
  const user = requireAuthenticatedUser()
  const conversation = ensureConversationRecord(conversationId, user.id)
  const sequence = getNextConversationMessageSequence(conversation.id)

  const result = db.insert(conversationMessages)
    .values({
      conversationId: conversation.id,
      invocationMetadataJson: invocationMetadata ? serializeJson(invocationMetadata) : null,
      messageJson: serializeJson(message),
      role: message.role,
      runtimeSnapshotJson: runtimeSnapshot ? serializeJson(buildDefaultRuntimeConfig(runtimeSnapshot)) : null,
      sequence,
    })
    .run()

  const preview = messageToPreview(message)
  const nextTitle = conversation.title === getDefaultConversationTitle() && message.role === 'user'
    ? buildConversationTitleFromMessage(preview)
    : conversation.title

  db.update(conversations)
    .set({
      lastMessageAt: new Date(message.timestamp).toISOString(),
      lastMessagePreview: preview,
      title: nextTitle,
    })
    .where(eq(conversations.id, conversation.id))
    .run()

  return mapConversationMessage(
    db.select()
      .from(conversationMessages)
      .where(eq(conversationMessages.id, Number(result.lastInsertRowid)))
      .limit(1)
      .get()!,
  )
}
