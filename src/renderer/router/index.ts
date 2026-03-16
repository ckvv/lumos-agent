import { useAuth } from '#renderer/composables/useAuth'
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
  if (!to.matched.some(record => record.meta.requiresAuth))
    return true

  const auth = useAuth()
  await auth.ensureBootstrapped()

  return true
})

if (import.meta.hot) {
  handleHotUpdate(router)
}
