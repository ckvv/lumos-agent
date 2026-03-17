# Database Migrations

## Source of Truth

- SQLite schema definitions live in `src/main/database/schema.ts`.
- Do not hand-edit low-level bootstrap files to add or change tables.
- Schema changes must be converted into SQL migrations under `drizzle/`.

## Commands

- `pnpm db:generate`: generate a new migration from the current Drizzle schema
- `pnpm db:delete`: delete the local SQLite database file used by the app in development, plus sidecar files such as `-wal` and `-shm`
- `pnpm db:studio`: launch Drizzle Studio against the Electron app database
- `pnpm start`: starts the app and applies pending migrations automatically
- `pnpm package` / `pnpm make`: package the app and include the `drizzle/` migration folder

## Runtime Behavior

- The main process owns SQLite bootstrap and migration execution.
- The renderer never opens the database directly.
- In development, migrations are loaded from the repository `drizzle/` directory.
- In packaged builds, migrations are loaded from bundled app resources.

## Current Tables

Auth:

- `users`
- `sessions`

Providers:

- `provider_configs`: one row per provider configuration, including builtin API key providers, OAuth-backed providers, and OpenAI-compatible endpoints
- `provider_models`: discovered or manually maintained models for OpenAI-compatible providers

Chat:

- `conversations`: per-user chat sessions, including persisted `runtimeConfigJson`
- `conversation_messages`: ordered per-conversation messages, storing raw `messageJson` plus `runtimeSnapshotJson`

## Storage Notes

- Provider secrets are stored in `provider_configs.encrypted_secret`.
- The app prefers Electron `safeStorage`; if encryption is unavailable it falls back to plaintext storage and exposes that state through provider/bootstrap summaries.
- Chat messages are persisted as the raw `@mariozechner/pi-ai` `Message` JSON so future tool, MCP, and skill message variants can be added without replacing the message table.
- `runtimeSnapshotJson` is stored per message to preserve the exact provider/model/runtime configuration used for that response.

## Updating the Schema

1. Edit `src/main/database/schema.ts`.
2. Run `pnpm db:generate`.
3. Review the generated SQL in `drizzle/`.
4. Run `pnpm lint`.
5. Run `pnpm typecheck`.
