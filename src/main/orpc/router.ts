import { enhanceRouter } from '@orpc/server'
import { orpcMiddlewares } from './middlewares'
import { appRouter } from './modules/app'

const modules = {
  app: appRouter,
}

export const router = enhanceRouter(modules, {
  dedupeLeadingMiddlewares: true,
  errorMap: {},
  middlewares: orpcMiddlewares,
})
