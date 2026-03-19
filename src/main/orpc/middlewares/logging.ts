import { logger } from '#main/logger'
import { os } from '@orpc/server'

const SENSITIVE_KEYS = new Set([
  'access',
  'apiKey',
  'customHeaders',
  'encryptedSecret',
  'env',
  'headers',
  'invocationMetadataJson',
  'password',
  'passwordHash',
  'refresh',
  'runtimeSnapshotJson',
])

function sanitizeLogInput(value: unknown, depth = 0): unknown {
  if (depth > 6)
    return '[Truncated]'

  if (Array.isArray(value))
    return value.map(item => sanitizeLogInput(item, depth + 1))

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEYS.has(key) ? '[REDACTED]' : sanitizeLogInput(nestedValue, depth + 1),
      ]),
    )
  }

  return value
}

export const loggingMiddleware = os.middleware(async ({ next, path }, input) => {
  const startedAt = performance.now()
  const procedurePath = path.join('.')

  logger.info({
    input: sanitizeLogInput(input),
    procedurePath,
  }, 'oRPC request started')

  try {
    const result = await next()
    const durationMs = Number((performance.now() - startedAt).toFixed(2))

    logger.info({
      durationMs,
      procedurePath,
    }, 'oRPC request completed')

    return result
  }
  catch (error) {
    const durationMs = Number((performance.now() - startedAt).toFixed(2))

    logger.warn({
      durationMs,
      err: error,
      procedurePath,
    }, 'oRPC request failed')

    throw error
  }
})
