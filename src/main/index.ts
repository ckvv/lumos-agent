import { app } from 'electron'
import started from 'electron-squirrel-startup'
import { registerAppLifecycle } from './app/lifecycle'
import { logger } from './logger'
import { registerORPCBridge } from './orpc/bridge'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  logger.info('Electron squirrel startup detected, quitting application')
  app.quit()
}

registerORPCBridge()
registerAppLifecycle()
