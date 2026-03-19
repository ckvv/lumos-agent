import { bootstrapProcessEnvironment } from '#main/app/environment'
import { registerAppLifecycle } from '#main/app/lifecycle'
import { logger } from '#main/logger'
import { registerORPCBridge } from '#main/orpc/bridge'
import { app } from 'electron'
import started from 'electron-squirrel-startup'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  logger.info('Electron squirrel startup detected, quitting application')
  app.quit()
}

const environmentBootstrap = bootstrapProcessEnvironment()

if (environmentBootstrap.pathUpdated) {
  logger.info({
    addedPathEntryCount: environmentBootstrap.addedPathEntries.length,
    pathKey: environmentBootstrap.pathKey,
    pathSource: environmentBootstrap.pathSource,
  }, 'Normalized main-process PATH for child processes')
}

registerORPCBridge()
registerAppLifecycle()
