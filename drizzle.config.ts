import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'drizzle-kit'
import { resolveDatabaseFilePath } from './src/main/database/database-paths'

// Drizzle Studio 在 CLI 环境下拿不到 Electron 的 app.getPath('userData')，这里镜像默认路径，并允许显式覆盖。
function getStudioDatabaseUrl() {
  const databaseFilePath = resolveDatabaseFilePath({
    databaseFilePath: process.env.DRIZZLE_STUDIO_DB_FILE,
  })

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
