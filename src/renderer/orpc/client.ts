import type { router } from '#main/orpc/router'
import type { RouterClient } from '@orpc/server'
import { ORPC_CONNECT_MESSAGE_TYPE } from '#shared/orpc/constants'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'

export type Client = RouterClient<typeof router>
export type AppInfo = Awaited<ReturnType<Client['app']['getInfo']>>

let clientPromise: Promise<Client> | undefined

export function getORPCClient() {
  if (!clientPromise) {
    clientPromise = new Promise<Client>((resolve) => {
      const channel = new MessageChannel()

      channel.port1.start()

      window.postMessage(
        { type: ORPC_CONNECT_MESSAGE_TYPE },
        '*',
        [channel.port2],
      )

      const client: Client = createORPCClient(new RPCLink({ port: channel.port1 }))
      resolve(client)
    })
  }

  return clientPromise
}
