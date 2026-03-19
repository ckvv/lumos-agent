import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

export function getManagedAgentProjectPath() {
  return path.join(app.getPath('userData'), 'agent-project')
}

export function ensureManagedAgentProjectPath() {
  const rootPath = getManagedAgentProjectPath()
  mkdirSync(rootPath, { recursive: true })
  return rootPath
}

export function getManagedSkillsRootPath() {
  return path.join(getManagedAgentProjectPath(), '.pi', 'skills')
}

export function ensureManagedSkillsRootPath() {
  const rootPath = getManagedSkillsRootPath()
  mkdirSync(rootPath, { recursive: true })
  return rootPath
}
