# Chat Workspace

## Overview

The authenticated application now centers on a chatbot workspace instead of the old authenticated marketing homepage.

Route layout:

- `/`: public about page
- `/auth`: public login / registration
- `/chat`: protected workspace
- `/settings/providers`: protected provider configuration

The protected shell is intentionally thin: top navigation, locale switcher, provider settings entry, and logout. The actual chat experience lives on `/chat`.
Conversation history is still available, but no longer stays pinned on the main canvas by default.

## Startup and Routing

The renderer bootstraps through `app.getBootstrap()`.

Routing rules:

- unauthenticated users can browse `/` and `/auth`
- authenticated users are redirected away from `/auth`
- `/chat` requires both authentication and a usable provider
- authenticated users without a usable provider are redirected to `/settings/providers`

## Provider Support

Current provider categories:

- builtin API key providers: OpenAI, Anthropic, Google
- OAuth providers exposed by `@mariozechner/pi-ai/oauth`
- OpenAI-compatible providers with custom `baseUrl`

OpenAI-compatible behavior:

- stores `displayName`, `baseUrl`, credentials, and compat overrides
- tries `${baseUrl}/models` discovery
- keeps working when discovery fails by allowing manual model management

Builtin Codex behavior:

- `openai-codex-responses` requests inject a fallback non-empty system prompt when the saved `systemPrompt` is blank, because the Codex backend rejects empty `instructions`

## Conversation Model

Each conversation stores a `ChatRuntimeConfig`:

- `providerConfigId`
- `modelId`
- `systemPrompt`
- `toolPolicy`
- `enabledCapabilities`

`enabledCapabilities` is empty for now, but exists to reserve room for future tool / MCP / skill bindings.

Messages persist:

- raw pi-ai `Message` JSON
- logical role
- per-message runtime snapshot
- stable sequence ordering

That structure lets the app add tool call, tool result, MCP, or skill-specific message blocks later without changing the storage model again.

## Renderer Composition

Main renderer composables:

- `useAppBootstrap`
- `useProviderSettings`
- `useConversationList`
- `useConversationDetail`
- `useChatStream`

Main UI surfaces:

- `AuthenticatedFrame`: protected application shell
- `ChatWorkspaceView`: chat page orchestration
- `ChatWorkspaceHeader`: focused workspace header and runtime controls
- `ChatConversationCanvas`: active conversation canvas and composer
- `ChatHistorySlideover`: on-demand conversation history panel
- `ConversationSidebar`: conversation CRUD and selection inside the history panel
- `MessageBubble`: Markdown/thinking rendering through `markstream-vue`
- `ProviderSettingsView`: provider configuration UI

Vue components should keep using composables as the feature boundary instead of calling the oRPC client directly.

## Streaming and Failure Handling

Chat streaming events:

- `started`
- `assistant_patch`
- `completed`
- `failed`

Failure handling expectations:

- keep partial assistant output visible when possible
- persist failure state into history instead of silently dropping it
- render persisted assistant error messages inside the message bubble, not only as transient page alerts
- recover from deleted conversations or missing selections by falling back to the next valid conversation
- surface oRPC and provider failures as visible UI messages
