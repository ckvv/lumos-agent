# oRPC Communication

This project uses `oRPC` as the typed bridge between the Electron main process and the Vue renderer. The renderer only talks to main-process services through the shared contract.

## Architecture

- `src/main/orpc/modules/*.ts`: domain-level router modules
- `src/main/orpc/middlewares/*.ts`: cross-cutting middleware such as logging and redaction
- `src/main/orpc/router.ts`: root router composition
- `src/main/orpc/bridge.ts`: upgrades Electron `MessagePortMain` into the oRPC server transport
- `src/preload/orpc/bridge.ts`: forwards the renderer-created `MessagePort`
- `src/renderer/orpc/client.ts`: creates the renderer oRPC client and reconnects when the message port is dropped

Transport flow:

1. renderer creates a `MessageChannel`
2. renderer transfers `port2` through preload
3. preload forwards the port to Electron main
4. main binds the oRPC handler to that port
5. renderer uses `port1` as the typed transport

## Current Modules

- `app`
  - `getBootstrap()`: unified startup snapshot for database, auth, routing, provider readiness, chat summary, and capability flags
  - `getInfo()`: desktop/runtime metadata
- `auth`
  - `register()`
  - `login()`
  - `logout()`
  - all auth mutations return the latest `AppBootstrap`
- `chat`
  - `providers.*`: provider configs, OAuth providers, compatible model sync/manual maintenance
  - `conversations.*`: create, list, detail, rename, delete, runtime config updates
  - `messages.send()`: streaming chat events

## Bootstrap Contract

Startup uses a single snapshot: `app.getBootstrap()`.

The renderer should not stitch together multiple bootstrap endpoints anymore. After the first snapshot is loaded:

- route guards use `bootstrap.routing`
- auth pages use `bootstrap.auth`
- provider settings use `chat.providers.*`
- chat workspace uses `chat.conversations.*` and `chat.messages.send()`

## Streaming Procedures

Two procedures currently use `eventIterator(...)`:

- `chat.providers.startOAuthLogin()`
- `chat.messages.send()`

Event shapes:

- OAuth login: `auth_url | progress | waiting_manual_code | success | failed | canceled`
- Chat streaming: `started | assistant_patch | completed | failed`

`assistant_patch` carries the full partial assistant snapshot so the renderer never has to merge provider deltas itself.

## Error Handling

- Renderer composables retry once when the underlying message port was closed or disconnected.
- Transport failures are mapped to visible UI messages.
- Main-process validation uses Zod at every public oRPC boundary.
- Logging middleware redacts secrets such as API keys, OAuth credentials, custom headers, and runtime snapshots.

## Adding a New Procedure

1. Implement the procedure in the correct domain module under `src/main/orpc/modules/`.
2. Compose the module in `src/main/orpc/router.ts` if needed.
3. Consume it through a renderer composable instead of calling the client directly from a Vue component.

Keep main-process only behavior in services under `src/main/services/`; keep shared contracts in `src/shared/`.
