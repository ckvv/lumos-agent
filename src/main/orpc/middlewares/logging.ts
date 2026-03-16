import { logger } from '#main/logger'
import { os } from '@orpc/server'

export const loggingMiddleware = os.middleware(async ({ next, path }, input) => {
  const startedAt = performance.now()
  const procedurePath = path.join('.')

  logger.info({
    input,
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
