import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'drizzle-kit'
import { APP_NAME, DATABASE_FILENAME } from './src/shared/app/constants'

function getElectronAppDataPath() {
  switch (process.platform) {
    case 'darwin':
      return path.join(os.homedir(), 'Library', 'Application Support')
    case 'win32':
      return process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
    default:
      return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config')
  }
}

// Drizzle Studio 在 CLI 环境下拿不到 Electron 的 app.getPath('userData')，这里镜像默认路径，并允许显式覆盖。
function getStudioDatabaseUrl() {
  const overrideFilePath = process.env.DRIZZLE_STUDIO_DB_FILE
  const databaseFilePath = overrideFilePath
    ? path.resolve(overrideFilePath)
    : path.join(getElectronAppDataPath(), APP_NAME, DATABASE_FILENAME)

  return pathToFileURL(databaseFilePath).href
}

export default defineConfig({
  breakpoints: true,
  dialect: 'sqlite',
  dbCredentials: {
    url: getStudioDatabaseUrl(),
  },
  out: './drizzle',
  schema: './src/main/database/schema.ts',
})
