import type { AuthBootstrapState, AuthCredentialsInput } from '#shared/auth/types'
import { Buffer } from 'node:buffer'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { getDatabaseBootstrapSnapshot, getDatabaseContext, startDatabaseBootstrapInBackground } from '#main/database/bootstrap'
import { sessions, users } from '#main/database/schema'
import { ORPCError } from '@orpc/server'
import { and, eq, isNull } from 'drizzle-orm'

const SCRYPT_KEY_LENGTH = 64
const SCRYPT_PREFIX = 'scrypt'
const scrypt = promisify(scryptCallback)

type DatabaseExecutor = NonNullable<ReturnType<typeof getDatabaseContext>>['db']

function nowAsIsoString() {
  return new Date().toISOString()
}

function normalizeUsername(username: string) {
  return username.trim()
}

function buildAuthState(hasUser: boolean, isAuthenticated: boolean): AuthBootstrapState {
  if (!hasUser)
    return 'needsRegistration'

  if (!isAuthenticated)
    return 'requiresLogin'

  return 'authenticated'
}

function getSingleUserRecord(db: DatabaseExecutor) {
  return db.select().from(users).where(isNull(users.deletedAt)).limit(1).get() ?? null
}

function getUserByUsername(db: DatabaseExecutor, username: string) {
  return db.select().from(users).where(
    and(
      eq(users.username, username),
      isNull(users.deletedAt),
    ),
  ).limit(1).get() ?? null
}

function getCurrentSessionRecord(db: DatabaseExecutor) {
  return db.select().from(sessions).where(isNull(sessions.deletedAt)).limit(1).get() ?? null
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH) as Buffer

  return `${SCRYPT_PREFIX}$${salt}$${derivedKey.toString('base64url')}`
}

async function verifyPassword(password: string, storedPasswordHash: string) {
  const [algorithm, salt, expectedHash] = storedPasswordHash.split('$')

  if (algorithm !== SCRYPT_PREFIX || !salt || !expectedHash)
    return false

  const expectedBuffer = Buffer.from(expectedHash, 'base64url')
  const actualBuffer = await scrypt(password, salt, expectedBuffer.length) as Buffer

  if (expectedBuffer.length !== actualBuffer.length)
    return false

  return timingSafeEqual(expectedBuffer, actualBuffer)
}

function requireDatabase() {
  const context = getDatabaseContext()

  if (!context) {
    throw new ORPCError('SERVICE_UNAVAILABLE', {
      message: 'Database is not ready yet',
    })
  }

  return context
}

export function getAuthBootstrapState() {
  let snapshot = getDatabaseBootstrapSnapshot()

  if (snapshot.status === 'idle' || snapshot.status === 'failed') {
    startDatabaseBootstrapInBackground()
    snapshot = getDatabaseBootstrapSnapshot()
  }

  if (snapshot.status !== 'ready') {
    return {
      authState: 'requiresLogin' as const,
      currentUsername: null,
      databaseInitError: snapshot.errorMessage,
      databaseInitStatus: snapshot.status,
      hasUser: false,
      isAuthenticated: false,
    }
  }

  const { db } = requireDatabase()
  const user = getSingleUserRecord(db)
  const session = getCurrentSessionRecord(db)
  const hasUser = Boolean(user)
  const isAuthenticated = Boolean(user && session?.isAuthenticated)

  return {
    authState: buildAuthState(hasUser, isAuthenticated),
    currentUsername: isAuthenticated ? user?.username ?? null : null,
    databaseInitError: snapshot.errorMessage,
    databaseInitStatus: snapshot.status,
    hasUser,
    isAuthenticated,
  }
}

function upsertSession(db: DatabaseExecutor, userId: number, isAuthenticated: boolean, now: string) {
  const existingSession = getCurrentSessionRecord(db)

  if (existingSession) {
    db.update(sessions)
      .set({
        deletedAt: null,
        isAuthenticated,
        updatedAt: now,
        userId,
      })
      .where(eq(sessions.id, existingSession.id))
      .run()

    return
  }

  db.insert(sessions).values({
    createdAt: now,
    deletedAt: null,
    isAuthenticated,
    updatedAt: now,
    userId,
  }).run()
}

export async function registerLocalUser(credentials: AuthCredentialsInput) {
  const username = normalizeUsername(credentials.username)
  const { db } = requireDatabase()

  if (getSingleUserRecord(db)) {
    throw new ORPCError('CONFLICT', {
      message: 'A local account already exists',
    })
  }

  const now = nowAsIsoString()
  const passwordHash = await hashPassword(credentials.password)

  db.transaction((tx) => {
    tx.insert(users).values({
      createdAt: now,
      deletedAt: null,
      passwordHash,
      updatedAt: now,
      username,
    }).run()

    const createdUser = getUserByUsername(tx, username)

    if (!createdUser) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to create the local account',
      })
    }

    upsertSession(tx, createdUser.id, true, now)
  })

  return getAuthBootstrapState()
}

export async function loginLocalUser(credentials: AuthCredentialsInput) {
  const username = normalizeUsername(credentials.username)
  const { db } = requireDatabase()
  const user = getUserByUsername(db, username)

  if (!user) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid username or password',
    })
  }

  const isValidPassword = await verifyPassword(credentials.password, user.passwordHash)

  if (!isValidPassword) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid username or password',
    })
  }

  upsertSession(db, user.id, true, nowAsIsoString())

  return getAuthBootstrapState()
}

export function logoutLocalUser() {
  const { db } = requireDatabase()
  const session = getCurrentSessionRecord(db)

  if (session) {
    db.update(sessions)
      .set({
        isAuthenticated: false,
        updatedAt: nowAsIsoString(),
      })
      .where(eq(sessions.id, session.id))
      .run()
  }

  return getAuthBootstrapState()
}
