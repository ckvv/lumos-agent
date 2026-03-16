# Logging

The Electron main process uses a shared `pino` logger from `src/main/logger/index.ts`.

## Goals

- structured logs for production-relevant failures
- one shared logger instance for the main process
- console logging only

## Usage

Import the shared logger where needed:

```ts
import { logger } from '../logger'
```

Record only actionable events:

```ts
logger.error({ err: error }, 'Failed to load renderer')
```

## Behavior

- default log level is `debug` in dev and `info` in packaged builds
- override the level with the `LOG_LEVEL` environment variable
- logs are written to stdout only
- the default code path only records startup, unexpected failures, and process-crash level events

## Guidance

- use the shared logger directly unless a module truly needs fixed extra bindings
- prefer machine-readable fields only when they help diagnose a failure
- log unexpected failures with `{ err }`
