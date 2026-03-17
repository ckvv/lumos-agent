import type { OAuthLoginEvent } from '#shared/chat/types'
import { randomUUID } from 'node:crypto'
import { shell } from 'electron'

interface QueueState<T> {
  done: boolean
  queue: T[]
  rejectWaiter: ((reason?: unknown) => void) | null
  resolveWaiter: ((value: IteratorResult<T>) => void) | null
}

interface ManualCodeSession {
  createdAt: number
  providerId: string
  reject: (reason?: unknown) => void
  resolve: (value: string) => void
}

const manualCodeSessions = new Map<string, ManualCodeSession>()

function createAsyncQueue<T>() {
  const state: QueueState<T> = {
    done: false,
    queue: [],
    rejectWaiter: null,
    resolveWaiter: null,
  }

  function push(event: T) {
    if (state.done)
      return

    if (state.resolveWaiter) {
      const resolve = state.resolveWaiter
      state.resolveWaiter = null
      state.rejectWaiter = null
      resolve({ done: false, value: event })
      return
    }

    state.queue.push(event)
  }

  function end() {
    state.done = true

    if (state.resolveWaiter) {
      const resolve = state.resolveWaiter
      state.resolveWaiter = null
      state.rejectWaiter = null
      resolve({ done: true, value: undefined as never })
    }
  }

  function fail(error: unknown) {
    state.done = true

    if (state.rejectWaiter) {
      const reject = state.rejectWaiter
      state.resolveWaiter = null
      state.rejectWaiter = null
      reject(error)
    }
  }

  const iterator: AsyncIteratorObject<T, unknown, void> = {
    [Symbol.asyncDispose]: async () => {
      end()
    },
    [Symbol.asyncIterator]() {
      return this
    },
    async next() {
      if (state.queue.length > 0) {
        return {
          done: false,
          value: state.queue.shift()!,
        }
      }

      if (state.done) {
        return {
          done: true,
          value: undefined as never,
        }
      }

      return new Promise<IteratorResult<T>>((resolve, reject) => {
        state.resolveWaiter = resolve
        state.rejectWaiter = reject
      })
    },
    async return() {
      end()
      return {
        done: true,
        value: undefined,
      }
    },
  }

  return {
    end,
    fail,
    iterator,
    push,
  }
}

export function createOAuthManualCodeSession(providerId: string, signal?: AbortSignal) {
  const sessionId = randomUUID()

  let settled = false

  const promise = new Promise<string>((resolve, reject) => {
    const resolveSession = (value: string) => {
      if (settled)
        return

      settled = true
      manualCodeSessions.delete(sessionId)
      resolve(value)
    }

    const rejectSession = (reason?: unknown) => {
      if (settled)
        return

      settled = true
      manualCodeSessions.delete(sessionId)
      reject(reason)
    }

    manualCodeSessions.set(sessionId, {
      createdAt: Date.now(),
      providerId,
      reject: rejectSession,
      resolve: resolveSession,
    })

    signal?.addEventListener('abort', () => {
      rejectSession(new Error('OAuth login was canceled'))
    }, { once: true })
  })

  return {
    promise,
    sessionId,
  }
}

export function submitOAuthManualCode(sessionId: string, code: string) {
  const session = manualCodeSessions.get(sessionId)

  if (!session)
    return false

  session.resolve(code)
  return true
}

export function cancelOAuthManualCodeSession(sessionId: string, reason = 'OAuth login was canceled') {
  const session = manualCodeSessions.get(sessionId)

  if (!session)
    return false

  session.reject(new Error(reason))
  return true
}

export async function openOAuthUrl(url: string) {
  await shell.openExternal(url)
}

export function createOAuthEventQueue() {
  return createAsyncQueue<OAuthLoginEvent>()
}
