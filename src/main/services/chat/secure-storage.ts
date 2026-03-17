import type { SecretStorageMode } from '#shared/chat/types'
import { Buffer } from 'node:buffer'
import { safeStorage } from 'electron'

const SAFE_STORAGE_PREFIX = 'safe:'
const PLAIN_TEXT_PREFIX = 'plain:'

export interface SecretPayload {
  mode: SecretStorageMode
  value: string
}

export function getSecretStorageState() {
  return {
    available: safeStorage.isEncryptionAvailable(),
    supported: typeof safeStorage.encryptString === 'function',
  }
}

export function encryptSecret(value: string): SecretPayload {
  const secureStorageState = getSecretStorageState()

  if (secureStorageState.available) {
    const encrypted = safeStorage.encryptString(value)
    return {
      mode: 'safeStorage',
      value: `${SAFE_STORAGE_PREFIX}${encrypted.toString('base64')}`,
    }
  }

  return {
    mode: 'plainText',
    value: `${PLAIN_TEXT_PREFIX}${value}`,
  }
}

export function decryptSecret(payload: string) {
  if (payload.startsWith(SAFE_STORAGE_PREFIX)) {
    const encrypted = payload.slice(SAFE_STORAGE_PREFIX.length)
    const buffer = Buffer.from(encrypted, 'base64')

    return safeStorage.decryptString(buffer)
  }

  if (payload.startsWith(PLAIN_TEXT_PREFIX))
    return payload.slice(PLAIN_TEXT_PREFIX.length)

  return payload
}
