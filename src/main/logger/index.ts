import process from 'node:process'
import pino from 'pino'

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL ?? (MAIN_WINDOW_VITE_DEV_SERVER_URL ? 'debug' : 'info')

type FlushableStream = ReturnType<typeof pino.destination> & {
  flushSync?: () => void
}

const stdoutStream = pino.destination({
  dest: 1,
  sync: false,
})

export const logger = pino({
  level: DEFAULT_LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
}, stdoutStream)

export function flushLogs() {
  ;(stdoutStream as FlushableStream).flushSync?.()
}
