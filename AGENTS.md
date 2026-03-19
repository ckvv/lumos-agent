# Repository Guidelines

## Core Expectations

- Prefer `pnpm` for dependency management and project commands.
- Use TypeScript throughout the app. For Vue files, use Composition API with `<script setup lang="ts">`.
- Prefer `@vueuse/core` composables before writing custom ones; add a bespoke composable only when VueUse does not cover the use case cleanly.
- Prefer `@nuxt/ui` components and composables for renderer UI; only build custom primitives when Nuxt UI is not a reasonable fit.
- Ask for confirmation before adding new production dependencies.
- Update `AGENTS.md` in the same change when you alter project structure, core commands, validation workflow, or dependency policy.
- Add or update `docs/` when a change affects shared behavior or needs contributor-facing explanation.

## Project Structure

This repository is an Electron Forge desktop app with a Vite + Vue 3 renderer.

- `src/main/`: Electron main-process startup, lifecycle, constants, window creation, and other desktop-only logic.
- `src/main/services/`: main-process business services that orchestrate app use cases and may coordinate database access.
- `src/main/services/agent/`: MCP registry, managed skill lifecycle, and chat capability assembly for agent-driven conversations.
- `src/main/database/`: database bootstrap, schema, and low-level connection utilities.
- `src/preload/`: secure bridge APIs exposed to the renderer through preload scripts.
- `src/renderer/`: Vue application code, including `pages/`, `components/`, `layouts/`, `router/`, `composables/`, `i18n/`, and shared styles.
- `src/renderer/composables/chat/`: instance-scoped chat workspace orchestration, including route sync, runtime selection, message sending, and conversation state factories.
- `src/shared/`: true cross-runtime types, constants, and protocol definitions that are safe to import from multiple runtimes.
- `src/shared/agent/`: cross-runtime MCP / skill contracts and tool-name helpers shared by main-process orchestration and renderer rendering.
- `drizzle/`: generated SQLite migration files that ship with packaged builds.
- `.github/workflows/`: repository automation workflows, including CI packaging for Electron distributables.
- `docs/`: contributor-facing documentation such as [`docs/i18n.md`](./docs/i18n.md).
- Root config: `vite.*`, `forge.config.ts`, `drizzle.config.ts`, `tsconfig.json`, `eslint.config.mjs`.

Keep desktop integrations in `src/main/` or `src/preload/`, and keep UI logic in `src/renderer/`.
Do not place Node.js or Electron-only details such as filesystem paths, database bootstrap, or OS integration in `src/shared/` unless they are genuine cross-runtime contracts.
Keep business orchestration in `src/main/services/` instead of mixing it into database infrastructure modules.

## Development Commands

- `pnpm install`: install dependencies.
- `pnpm db:generate`: generate SQLite migrations from `src/main/database/schema.ts`.
- `pnpm db:delete`: delete the local SQLite database file and SQLite sidecar files from the app's default `userData` directory.
- `pnpm db:studio`: launch Drizzle Studio for the Electron app's local SQLite database.
- `pnpm start`: run the Electron Forge development app.
- `pnpm lint`: run ESLint with autofix (`eslint --fix`).
- `pnpm typecheck`: run Vue + TypeScript type checking with `vue-tsc --noEmit`.
- `pnpm package`: build the app without creating installers.
- `pnpm make`: generate platform distribution artifacts.

## Coding Conventions

- Default collaboration language is Simplified Chinese unless the user, existing file conventions, or external interface requirements call for another language.
- Add necessary Chinese comments for non-obvious logic, edge cases, or important constraints; avoid comments that only restate the code literally.
- Use 2-space indentation.
- Name Vue components in PascalCase, for example `LocaleSwitcher.vue`.
- Name reusable composables as `useX.ts`, for example `useLocale.ts`.
- Name instance-scoped feature state factories as `createX.ts` or `createXState.ts` when they assemble private refs/actions for a single screen or workspace lifecycle.
- Place route-level pages under `src/renderer/pages/`.
- Keep code simple, typed, and consistent with existing module boundaries.
- Follow the repository linting baseline provided by `@antfu/eslint-config`.

## Collaboration Expectations

- Do not optimize for agreement with the user. If a request, assumption, or proposed solution is technically weak, say so clearly and propose a better alternative.
- When refactoring, prioritize long-term extensibility and maintainability over preserving the previous architecture.

## Validation Workflow

There is no dedicated automated test framework configured yet. Until one is added, validate changes manually:

- start the app with `pnpm start`
- verify affected routes and UI flows
- confirm preload-exposed features still work
- rerun `pnpm lint`
- rerun `pnpm typecheck`

Run `pnpm lint` and `pnpm typecheck` before opening a pull request.
When changing the database schema, also run `pnpm db:generate` and commit the updated `drizzle/` migration files.

## Release Packaging

- GitHub Actions packaging lives in `.github/workflows/package-electron.yml`.
- The workflow runs `pnpm make` on native macOS and Windows runners and uploads `out/make/` as workflow artifacts.
- Contributor-facing packaging details should stay documented in `docs/github-actions-packaging.md`.

## Commit & Pull Request Guidelines

Use clear, imperative commit messages such as `feat: add locale persistence` or `fix: guard missing preload API`.

Pull requests should include:

- a short description of the change and its impact
- linked issue or task when applicable
- screenshots or recordings for UI changes
- confirmation that `pnpm lint` and `pnpm typecheck` passed
