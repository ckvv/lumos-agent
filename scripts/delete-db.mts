import { existsSync, rmSync } from 'node:fs'
import process from 'node:process'
import { getDatabaseSidecarPaths, resolveDatabaseFilePath } from '../src/main/database/database-paths.ts'
import { APP_NAME } from '../src/shared/app/constants.ts'

const databaseFilePath = resolveDatabaseFilePath()
const databasePaths = getDatabaseSidecarPaths(databaseFilePath)

const deletedPaths: string[] = []

for (const filePath of databasePaths) {
  if (!existsSync(filePath))
    continue

  rmSync(filePath, { force: true })
  deletedPaths.push(filePath)
}

if (deletedPaths.length === 0) {
  console.log(`No SQLite database files found for ${APP_NAME}.`)
  console.log(`Checked: ${databaseFilePath}`)
  process.exit(0)
}

console.log('Deleted SQLite database files:')
for (const filePath of deletedPaths)
  console.log(`- ${filePath}`)
