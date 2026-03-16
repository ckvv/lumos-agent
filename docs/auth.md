# Local Authentication

## Overview

This app boots a local SQLite database in the Electron main process and keeps all database access there. The renderer only talks to auth procedures through oRPC.

Bootstrap flow:

1. `app.on('ready')` creates the main window immediately.
2. The main process starts database bootstrap in the background.
3. The renderer calls `auth.getBootstrapState()` and renders one of:
   - database initialization
   - first-time registration
   - login
   - authenticated application shell

## Database Initialization

- Database file path: `app.getPath('userData')/lumos.sqlite`
- Init status contract: `idle | initializing | ready | failed`
- Schema creation is idempotent and runs in the main process before auth queries are allowed.
- Renderer never opens SQLite directly.

If bootstrap fails, the renderer shows the failure state and offers a retry action that restarts the app bootstrap flow.

## Tables and Audit Fields

All business tables include the same audit columns:

- `createdAt`: UTC ISO timestamp written on insert
- `updatedAt`: UTC ISO timestamp refreshed on update
- `deletedAt`: soft-delete timestamp, `null` by default

Current auth tables:

- `users`: single local account record with `username` and `passwordHash`
- `sessions`: single logical local session with `userId` and `isAuthenticated`

Query rules:

- reads ignore rows where `deletedAt` is not `null`
- this version does not expose delete flows, but soft-delete compatibility is enforced in table design and queries

## Auth State Flow

`auth.getBootstrapState()` returns:

- `databaseInitStatus`
- `databaseInitError`
- `hasUser`
- `isAuthenticated`
- `currentUsername`
- `authState`

`authState` is resolved as:

- `needsRegistration`: no active local user exists
- `requiresLogin`: a local user exists but there is no authenticated session
- `authenticated`: an authenticated local session exists

Mutations:

- `auth.register(input)`: allowed only when no local user exists; creates the user and signs in immediately
- `auth.login(input)`: validates username and password, then marks the local session authenticated
- `auth.logout()`: clears only the authenticated session flag and keeps the local user

Passwords are hashed with `node:crypto` `scrypt` plus a random salt. Plaintext passwords are never stored.

## Router Guard Strategy

- Protected routes set `meta.requiresAuth = true`
- `AppShell` is the final rendering gate and never renders protected content until auth state is `authenticated`
- `router.beforeEach` ensures the first bootstrap request has run before protected routes continue
- Direct hash access to protected routes is allowed, but unauthenticated users still only see the auth shell until login succeeds

## Validation Rules

All auth procedure inputs and outputs are validated with Zod.

- `username`: required, trimmed, empty string rejected
- `password`: required, empty string rejected, no automatic trim
- bootstrap responses are validated before crossing the renderer boundary
