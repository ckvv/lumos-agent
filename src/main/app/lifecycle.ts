import process from 'node:process'
import { app, BrowserWindow } from 'electron'
import { flushLogs, logger } from '../logger'
import { createMainWindow } from '../windows/main-window'

export function registerAppLifecycle() {
  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception in main process')
    flushLogs()
  })

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection in main process')
  })

  app.on('ready', () => {
    logger.info('Electron app ready')
    createMainWindow()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      flushLogs()
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })

  app.on('before-quit', () => {
    flushLogs()
  })
}
