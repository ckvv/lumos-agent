import { loggingMiddleware } from '#main/orpc/middlewares/logging'

export const orpcMiddlewares = [
  loggingMiddleware,
] as const
