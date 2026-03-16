import { RPCHandler } from '@orpc/server/message-port'
import { ipcMain } from 'electron'
import { ORPC_CONNECT_CHANNEL } from '../../shared/orpc/constants'
import { lumosRouter } from './router'

const rpcHandler = new RPCHandler(lumosRouter)

export function registerORPCBridge() {
  ipcMain.on(ORPC_CONNECT_CHANNEL, (event) => {
    const [port] = event.ports

    if (!port) {
      return
    }

    rpcHandler.upgrade(port)
    port.start()
  })
}
