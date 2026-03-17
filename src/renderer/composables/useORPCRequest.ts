import type { Client } from '#renderer/orpc/client'
import { getORPCClient, resetORPCClient, shouldRetryORPCTransport } from '#renderer/orpc/client'

export function getORPCErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

export async function runWithORPCClient<T>(handler: (client: Client) => Promise<T>) {
  try {
    return await handler(await getORPCClient())
  }
  catch (error) {
    if (!shouldRetryORPCTransport(error))
      throw error

    resetORPCClient()
    return handler(await getORPCClient())
  }
}
