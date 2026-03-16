import { RPCHandler } from '@orpc/server/message-port'
import { ipcMain } from 'electron'
import { ORPC_CONNECT_CHANNEL } from '../../shared/orpc/constants'
import { logger } from '../logger'
import { router } from './router'

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
