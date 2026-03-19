import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

export interface ProcessEnvironmentBootstrapResult {
  addedPathEntries: string[]
  pathKey: string
  pathSource: 'existing' | 'fallback' | 'login-shell'
  pathUpdated: boolean
}

const LOGIN_SHELL_PATH_START = '__LUMOS_LOGIN_SHELL_PATH_START__'
const LOGIN_SHELL_PATH_END = '__LUMOS_LOGIN_SHELL_PATH_END__'
const LOGIN_SHELL_PATH_COMMAND = `printf '${LOGIN_SHELL_PATH_START}%s${LOGIN_SHELL_PATH_END}' "$PATH"`
const LOGIN_SHELL_TIMEOUT_MS = 5000

const COMMON_UNIX_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
]

let cachedBootstrapResult: ProcessEnvironmentBootstrapResult | null = null

function getPathKey(env: NodeJS.ProcessEnv = process.env) {
  return Object.keys(env).find(key => key.toLowerCase() === 'path') ?? 'PATH'
}

function splitPathEntries(value: string | undefined) {
  return (value ?? '')
    .split(path.delimiter)
    .map(entry => entry.trim())
    .filter(Boolean)
}

function uniqueEntries(entries: string[]) {
  return Array.from(new Set(entries))
}

function extractMarkedPath(stdout: string) {
  const startIndex = stdout.indexOf(LOGIN_SHELL_PATH_START)

  if (startIndex === -1)
    return null

  const valueStartIndex = startIndex + LOGIN_SHELL_PATH_START.length
  const endIndex = stdout.indexOf(LOGIN_SHELL_PATH_END, valueStartIndex)

  if (endIndex === -1)
    return null

  return stdout.slice(valueStartIndex, endIndex).trim() || null
}

function getShellCandidates() {
  return uniqueEntries([
    process.env.SHELL,
    process.platform === 'darwin' ? '/bin/zsh' : null,
    '/bin/bash',
    '/bin/sh',
  ].filter((candidate): candidate is string => {
    if (typeof candidate !== 'string')
      return false

    return existsSync(candidate)
  }))
}

function getShellArgumentSets(shellPath: string) {
  const shellName = path.basename(shellPath).toLowerCase()

  if (['bash', 'fish', 'ksh', 'zsh'].includes(shellName)) {
    return [
      ['-l', '-i', '-c', LOGIN_SHELL_PATH_COMMAND],
      ['-l', '-c', LOGIN_SHELL_PATH_COMMAND],
      ['-c', LOGIN_SHELL_PATH_COMMAND],
    ]
  }

  return [['-c', LOGIN_SHELL_PATH_COMMAND]]
}

function resolveLoginShellPathEntries() {
  // 打包版从 Finder / Launchpad 启动时，PATH 往往比终端里短，
  // 这里额外读取登录 shell 的 PATH，尽量补齐 Homebrew / nvm 等用户态命令。
  for (const shellPath of getShellCandidates()) {
    for (const args of getShellArgumentSets(shellPath)) {
      const result = spawnSync(shellPath, args, {
        encoding: 'utf8',
        shell: false,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: LOGIN_SHELL_TIMEOUT_MS,
        windowsHide: true,
      })

      if (result.error)
        continue

      const shellPathValue = extractMarkedPath(result.stdout ?? '')

      if (shellPathValue)
        return splitPathEntries(shellPathValue)
    }
  }

  return []
}

function getFallbackPathEntries() {
  const homeDir = os.homedir()

  return uniqueEntries([
    ...COMMON_UNIX_PATHS,
    path.join(homeDir, '.volta', 'bin'),
    path.join(homeDir, '.local', 'bin'),
    path.join(homeDir, '.yarn', 'bin'),
    path.join(homeDir, '.pnpm'),
    path.join(homeDir, '.npm-global', 'bin'),
  ].filter(existsSync))
}

export function bootstrapProcessEnvironment(): ProcessEnvironmentBootstrapResult {
  if (cachedBootstrapResult)
    return cachedBootstrapResult

  const pathKey = getPathKey()
  const currentEntries = splitPathEntries(process.env[pathKey])
  const loginShellEntries = process.platform === 'win32' ? [] : resolveLoginShellPathEntries()
  const fallbackEntries = process.platform === 'win32' ? [] : getFallbackPathEntries()
  const mergedEntries = uniqueEntries([
    ...loginShellEntries,
    ...currentEntries,
    ...fallbackEntries,
  ])

  if (mergedEntries.length > 0)
    process.env[pathKey] = mergedEntries.join(path.delimiter)

  if (!process.env.SHELL) {
    const firstShellCandidate = getShellCandidates()[0]

    if (firstShellCandidate)
      process.env.SHELL = firstShellCandidate
  }

  const addedPathEntries = mergedEntries.filter(entry => !currentEntries.includes(entry))
  const pathSource = loginShellEntries.length > 0
    ? 'login-shell'
    : addedPathEntries.length > 0
      ? 'fallback'
      : 'existing'

  cachedBootstrapResult = {
    addedPathEntries,
    pathKey,
    pathSource,
    pathUpdated: addedPathEntries.length > 0,
  }

  return cachedBootstrapResult
}
