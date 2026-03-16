import process from 'node:process'
import { closeDatabase, startDatabaseBootstrapInBackground } from '#main/database/bootstrap'
import { flushLogs, logger } from '#main/logger'
import { createMainWindow } from '#main/windows/main-window'
import { app, BrowserWindow } from 'electron'

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
    startDatabaseBootstrapInBackground()
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
    closeDatabase()
    flushLogs()
  })
}
