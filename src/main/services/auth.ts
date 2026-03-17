import type { DatabaseExecutor } from '#main/database/database'
import type { AuthBootstrapState, AuthCredentialsInput, AuthSessionSnapshot } from '#shared/auth/types'
import { Buffer } from 'node:buffer'
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from '#main/database/database'
import { sessions, users } from '#main/database/schema'
import { ORPCError } from '@orpc/server'
import { eq } from 'drizzle-orm'

const SCRYPT_KEY_LENGTH = 64
const SCRYPT_PREFIX = 'scrypt'
const scrypt = promisify(scryptCallback)

function buildAuthState(hasUser: boolean, isAuthenticated: boolean): AuthBootstrapState {
  if (!hasUser)
    return 'needsRegistration'

  if (!isAuthenticated)
    return 'requiresLogin'

  return 'authenticated'
}

function getSingleUserRecord(db: DatabaseExecutor) {
  return db.select().from(users).limit(1).get() ?? null
}

function getUserByUsername(db: DatabaseExecutor, username: string) {
  return db.select().from(users).where(eq(users.username, username)).limit(1).get() ?? null
}

function getCurrentSessionRecord(db: DatabaseExecutor) {
  return db.select().from(sessions).limit(1).get() ?? null
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

export function getAuthSessionSnapshot(): AuthSessionSnapshot {
  const user = getSingleUserRecord(db)
  const session = getCurrentSessionRecord(db)
  const hasUser = Boolean(user)
  const isAuthenticated = Boolean(user && session?.isAuthenticated)

  return {
    state: buildAuthState(hasUser, isAuthenticated),
    currentUsername: isAuthenticated ? user?.username ?? null : null,
    hasUser,
    isAuthenticated,
  }
}

function upsertSession(db: DatabaseExecutor, userId: number, isAuthenticated: boolean) {
  const existingSession = getCurrentSessionRecord(db)

  if (existingSession) {
    db.update(sessions)
      .set({
        isAuthenticated,
        userId,
      })
      .where(eq(sessions.id, existingSession.id))
      .run()

    return
  }

  db.insert(sessions).values({
    isAuthenticated,
    userId,
  }).run()
}

export function getAuthenticatedUser() {
  const user = getSingleUserRecord(db)
  const session = getCurrentSessionRecord(db)

  if (!user || !session?.isAuthenticated)
    return null

  return user
}

export function requireAuthenticatedUser() {
  const user = getAuthenticatedUser()

  if (!user) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'You must be signed in to access chat features',
    })
  }

  return user
}

export async function registerLocalUser(credentials: AuthCredentialsInput) {
  const { username } = credentials

  if (getSingleUserRecord(db)) {
    throw new ORPCError('CONFLICT', {
      message: 'A local account already exists',
    })
  }

  const passwordHash = await hashPassword(credentials.password)

  db.transaction((tx) => {
    tx.insert(users).values({
      passwordHash,
      username,
    }).run()

    const createdUser = getUserByUsername(tx, username)

    if (!createdUser) {
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to create the local account',
      })
    }

    upsertSession(tx, createdUser.id, true)
  })

  return getAuthSessionSnapshot()
}

export async function loginLocalUser(credentials: AuthCredentialsInput) {
  const { username } = credentials
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

  upsertSession(db, user.id, true)

  return getAuthSessionSnapshot()
}

export function logoutLocalUser() {
  const session = getCurrentSessionRecord(db)

  if (session) {
    db.update(sessions)
      .set({
        isAuthenticated: false,
      })
      .where(eq(sessions.id, session.id))
      .run()
  }

  return getAuthSessionSnapshot()
}
