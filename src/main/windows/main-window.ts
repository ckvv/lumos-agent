import path from 'node:path'
import process from 'node:process'
import { getWindowIcon } from '#main/app/icon'
import { MAIN_WINDOW_CONFIG } from '#main/constants'
import { logger } from '#main/logger'
import { BrowserWindow } from 'electron'

export function createMainWindow() {
  const isDevelopment = Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  const mainWindow = new BrowserWindow({
    ...MAIN_WINDOW_CONFIG,
    icon: process.platform === 'darwin' ? undefined : getWindowIcon(),
    show: false,
    webPreferences: {
      contextIsolation: true,
      devTools: isDevelopment,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error({
      reason: details.reason,
      exitCode: details.exitCode,
    }, 'Renderer process exited unexpectedly')
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch((error) => {
      logger.error({ err: error }, 'Failed to load renderer from Vite dev server')
    })
  }
  else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    ).catch((error) => {
      logger.error({ err: error }, 'Failed to load packaged renderer bundle')
    })
  }

  return mainWindow
}
