import { ipcRenderer } from 'electron'
import { ORPC_CONNECT_CHANNEL, ORPC_CONNECT_MESSAGE_TYPE } from '../../shared/orpc/constants'

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return
  }

  if (event.data?.type !== ORPC_CONNECT_MESSAGE_TYPE) {
    return
  }

  const [port] = event.ports

  if (!port) {
    return
  }

  ipcRenderer.postMessage(ORPC_CONNECT_CHANNEL, null, [port])
})
