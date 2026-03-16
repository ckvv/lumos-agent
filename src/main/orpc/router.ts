import { orpcMiddlewares } from '#main/orpc/middlewares'
import { appRouter } from '#main/orpc/modules/app'
import { enhanceRouter } from '@orpc/server'

const modules = {
  app: appRouter,
}

export const router = enhanceRouter(modules, {
  dedupeLeadingMiddlewares: true,
  errorMap: {},
  middlewares: orpcMiddlewares,
})
