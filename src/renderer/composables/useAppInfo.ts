import type { AppInfo } from '#renderer/orpc/client'
import { getORPCClient } from '#renderer/orpc/client'
import { readonly, shallowRef } from 'vue'

const appInfo = shallowRef<AppInfo | null>(null)
const errorMessage = shallowRef<string | null>(null)
const isLoading = shallowRef(false)

export function useAppInfo() {
  async function refresh() {
    isLoading.value = true
    errorMessage.value = null

    try {
      const client = await getORPCClient()
      appInfo.value = await client.app.getInfo()
    }
    catch (error) {
      appInfo.value = null
      errorMessage.value = error instanceof Error ? error.message : 'Unknown error'
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    appInfo: readonly(appInfo),
    errorMessage: readonly(errorMessage),
    isLoading: readonly(isLoading),
    refresh,
  }
}
