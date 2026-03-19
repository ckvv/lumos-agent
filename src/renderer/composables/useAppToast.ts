import { useToast } from '@nuxt/ui/composables'

interface AppToastOptions {
  description?: string
  duration?: number
  id?: string | number
}

export function useAppToast() {
  const toast = useToast()

  function success(title: string, options: AppToastOptions = {}) {
    toast.add({
      color: 'success',
      title,
      ...options,
    })
  }

  function error(title: string, options: AppToastOptions = {}) {
    toast.add({
      color: 'error',
      duration: options.duration ?? 6000,
      title,
      ...options,
    })
  }

  return {
    error,
    success,
  }
}
