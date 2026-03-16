# Database migrations

## Source of truth

- SQLite table definitions live in `src/main/database/schema.ts`.
- Do not hand-edit `src/main/database/bootstrap.ts` to add or change tables.
- Schema changes must be converted into SQL migrations under `drizzle/`.

## Commands

- `pnpm db:generate`: generate a new migration from the current Drizzle schema.
- `pnpm start`: starts the app and applies pending migrations automatically.
- `pnpm package` / `pnpm make`: package the app and include the `drizzle/` migration folder for installed builds.

## Runtime behavior

- On startup, the main process applies migrations before exposing the database to the rest of the app.
- In development, migrations are loaded from the repository `drizzle/` directory.
- In packaged apps, migrations are loaded from the bundled app resources directory.

## Updating the schema

1. Edit `src/main/database/schema.ts`.
2. Run `pnpm db:generate`.
3. Review the generated SQL under `drizzle/`.
4. Run `pnpm lint` and `pnpm typecheck`.
