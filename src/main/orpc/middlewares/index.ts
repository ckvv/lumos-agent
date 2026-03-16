import { loggingMiddleware } from './logging'

export const orpcMiddlewares = [
  loggingMiddleware,
] as const
