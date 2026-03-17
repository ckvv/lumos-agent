import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { APP_NAME, DATABASE_FILENAME } from '#shared/app/constants'

export interface ResolveDatabaseFilePathOptions {
  allowEnvOverride?: boolean
  databaseFilePath?: string
  env?: NodeJS.ProcessEnv
  homeDir?: string
  platform?: NodeJS.Platform
  userDataPath?: string
}

function getDefaultAppDataPath(options: ResolveDatabaseFilePathOptions = {}) {
  const homeDir = options.homeDir ?? os.homedir()
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env

  switch (platform) {
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support')
    case 'win32':
      return env.APPDATA ?? path.join(homeDir, 'AppData', 'Roaming')
    default:
      return env.XDG_CONFIG_HOME ?? path.join(homeDir, '.config')
  }
}

export function getDefaultUserDataPath(options: ResolveDatabaseFilePathOptions = {}) {
  return path.join(getDefaultAppDataPath(options), APP_NAME)
}

export function resolveDatabaseFilePath(options: ResolveDatabaseFilePathOptions = {}) {
  const env = options.env ?? process.env
  const allowEnvOverride = options.allowEnvOverride ?? true
  const databaseFilePath = options.databaseFilePath
    ?? (allowEnvOverride ? env.LUMOS_DB_FILE : undefined)

  if (databaseFilePath)
    return path.resolve(databaseFilePath)

  const userDataPath = options.userDataPath
    ?? (allowEnvOverride ? env.LUMOS_USER_DATA_DIR : undefined)
    ?? getDefaultUserDataPath(options)

  return path.join(userDataPath, DATABASE_FILENAME)
}

export function getDatabaseSidecarPaths(databaseFilePath: string) {
  return [
    databaseFilePath,
    `${databaseFilePath}-shm`,
    `${databaseFilePath}-wal`,
    `${databaseFilePath}-journal`,
  ]
}
