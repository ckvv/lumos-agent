# Local Authentication

## Overview

Authentication is still local-only and stays fully inside the Electron main process, but the renderer no longer bootstraps auth through a dedicated auth snapshot. Startup now goes through a single `app.getBootstrap()` contract.

Route shape:

- `/`: public about page
- `/auth`: public login / registration page
- `/chat`: authenticated chat workspace shell + new conversation view
- `/chat/:id`: authenticated chat workspace shell + conversation view
- `/settings/providers`: authenticated provider settings

The renderer never reads SQLite directly and never handles credential storage itself.

## Unified Bootstrap Flow

Startup flow:

1. `app.on('ready')` creates the window and starts database bootstrap in the background.
2. The renderer calls `app.getBootstrap()`.
3. While `database.status` is `idle` or `initializing`, the renderer shows the init state and polls again.
4. Once the database is `ready`, the same bootstrap response also contains auth state, provider readiness, chat summary, and recommended routing.

`AppBootstrap` currently includes:

- `database`: `status` and `errorMessage`
- `auth`: `hasUser`, `isAuthenticated`, `currentUsername`, `state`
- `providerSummary`: configured counts, usable-provider flag, secret-storage flags
- `chatSummary`: conversation count and latest conversation id
- `routing`: `recommendedRoute`, chat access flag, provider-settings redirect flag
- `capabilityFlags`: reserved feature flags for future tool / MCP / skill support

## Auth State Flow

`auth.state` resolves to:

- `needsRegistration`: no local user exists yet
- `requiresLogin`: user exists but the session is not authenticated
- `authenticated`: local session is authenticated

Mutations:

- `auth.register(input)`: creates the first local user, signs in immediately, returns the latest `AppBootstrap`
- `auth.login(input)`: validates credentials, authenticates the session, returns the latest `AppBootstrap`
- `auth.logout()`: clears only the authenticated session flag, keeps the local user, returns the latest `AppBootstrap`

Passwords are hashed with `node:crypto` `scrypt` plus a random salt. Plaintext passwords are never stored.

## Router Guard Strategy

- `/` is always public.
- `/auth` is public, but authenticated users are redirected to `bootstrap.routing.recommendedRoute`.
- `/chat` and `/chat/:id` both live under the same authenticated parent route.
- Routes with `meta.requiresAuth = true` require an authenticated session.
- Routes with `meta.requiresProvider = true` also require `providerSummary.hasUsableProvider = true`.
- If a user is authenticated but has no usable provider, `/chat` redirects to `/settings/providers`.
- Legacy `#/chat?conversationId=123` links are normalized in the renderer to `#/chat/123` before the workspace syncs conversation state.

## Failure and Retry Behavior

- If database bootstrap fails, `app.getBootstrap()` reports `database.status = failed`.
- The renderer shows a retry action and calls `app.getBootstrap()` again after re-triggering main-process bootstrap.
- oRPC transport failures are surfaced as visible UI errors instead of blank states.

## Database Ownership

Auth still uses the same two tables:

- `users`
- `sessions`

All auth reads and writes stay in `src/main/services/auth.ts`. The renderer only uses oRPC procedures.
