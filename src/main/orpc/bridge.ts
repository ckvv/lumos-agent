import { logger } from '#main/logger'
import { router } from '#main/orpc/router'
import { ORPC_CONNECT_CHANNEL } from '#shared/orpc/constants'
import { RPCHandler } from '@orpc/server/message-port'
import { ipcMain } from 'electron'

const rpcHandler = new RPCHandler(router)

export function registerORPCBridge() {
  ipcMain.on(ORPC_CONNECT_CHANNEL, (event) => {
    const [port] = event.ports

    if (!port) {
      logger.warn('Received oRPC connection request without a MessagePort')
      return
    }

    rpcHandler.upgrade(port)
    port.start()
  })
}
