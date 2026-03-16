import { orpcMiddlewares } from '#main/orpc/middlewares'
import { appRouter } from '#main/orpc/modules/app'
import { authRouter } from '#main/orpc/modules/auth'
import { enhanceRouter } from '@orpc/server'

const modules = {
  app: appRouter,
  auth: authRouter,
}

export const router = enhanceRouter(modules, {
  dedupeLeadingMiddlewares: true,
  errorMap: {},
  middlewares: orpcMiddlewares,
})
