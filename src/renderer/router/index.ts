import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { createRouter, createWebHashHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

export type { RouteLocationRaw, RouteRecordName } from 'vue-router'
export { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'

export type { RouteNamedMap } from 'vue-router/auto-routes'

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const bootstrap = useAppBootstrap()

  if (to.path === '/') {
    await bootstrap.ensureBootstrapped()

    if (bootstrap.viewState.value !== 'ready')
      return '/auth'

    return bootstrap.recommendedRoute.value
  }

  if (to.path === '/auth') {
    await bootstrap.ensureBootstrapped()

    if (bootstrap.viewState.value === 'ready' && bootstrap.isAuthenticated.value)
      return bootstrap.recommendedRoute.value

    return true
  }

  if (!to.matched.some(record => record.meta.requiresAuth))
    return true

  await bootstrap.ensureBootstrapped()

  if (bootstrap.viewState.value !== 'ready' || !bootstrap.isAuthenticated.value)
    return '/auth'

  return true
})

if (import.meta.hot) {
  handleHotUpdate(router)
}
