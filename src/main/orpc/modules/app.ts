import process from 'node:process'
import { os } from '@orpc/server'
import { app } from 'electron'

export const appRouter = {
  getInfo: os.handler(() => ({
    chromeVersion: process.versions.chrome,
    electronVersion: process.versions.electron,
    locale: app.getLocale(),
    name: app.getName(),
    nodeVersion: process.versions.node,
    platform: process.platform,
    version: app.getVersion(),
  })),
}
