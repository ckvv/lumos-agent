# oRPC Communication

This project uses `oRPC` as the typed communication layer between the Electron main process and the Vue renderer.

## Architecture

- `src/main/orpc/modules/*.ts`: domain-level main-process router modules.
- `src/main/orpc/middlewares/*.ts`: cross-cutting oRPC middlewares such as logging.
- `src/main/orpc/router.ts`: root router that composes domain modules.
- `src/main/orpc/bridge.ts`: upgrades the transferred Electron `MessagePortMain` into an `oRPC` server handler.
- `src/preload/orpc/bridge.ts`: forwards the renderer-created message port to Electron IPC.
- `src/renderer/orpc/client.ts`: creates the renderer-side `oRPC` client from `MessageChannel.port1`.

The transport follows the official Electron adapter shape:

1. renderer creates a `MessageChannel`
2. renderer transfers `port2` to preload via `window.postMessage`
3. preload forwards that port to main via `ipcRenderer.postMessage`
4. main upgrades the received port with `RPCHandler`
5. renderer uses `port1` as the typed `oRPC` client transport

## Why this shape

- One typed contract is shared across main, preload, and renderer-facing types.
- The preload layer stays a thin bridge instead of becoming a second RPC client layer.
- `MessagePort` keeps the transport generic and avoids creating one IPC channel per capability.
- New desktop capabilities can be added by extending the contract and implementing the matching router procedure.

## Adding a new procedure

1. Implement the procedure inside the matching module under `src/main/orpc/modules/`.
2. Re-export or compose that module from `src/main/orpc/router.ts` when a new domain is introduced.
3. Consume it from renderer composables or components through `src/renderer/orpc/client.ts`.

## Router Organization

- Keep each domain in its own module, such as `app`, `settings`, or `window`.
- Keep `src/main/orpc/router.ts` as the single composition layer for both domain modules and shared middlewares.
- Register cross-cutting middleware in `src/main/orpc/middlewares/index.ts` so future concerns like auth, metrics, or auditing can be added without touching every procedure.
