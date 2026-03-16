import type { RouterClient } from '@orpc/server'
import type { lumosRouter } from '../../main/orpc/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'
import { ORPC_CONNECT_MESSAGE_TYPE } from '../../shared/orpc/constants'

export type LumosClient = RouterClient<typeof lumosRouter>
export type AppInfo = Awaited<ReturnType<LumosClient['app']['getInfo']>>

let clientPromise: Promise<LumosClient> | undefined

export function getORPCClient() {
  if (!clientPromise) {
    clientPromise = new Promise<LumosClient>((resolve) => {
      const channel = new MessageChannel()

      channel.port1.start()

      window.postMessage(
        { type: ORPC_CONNECT_MESSAGE_TYPE },
        '*',
        [channel.port2],
      )

      const client: LumosClient = createORPCClient(new RPCLink({ port: channel.port1 }))
      resolve(client)
    })
  }

  return clientPromise
}
