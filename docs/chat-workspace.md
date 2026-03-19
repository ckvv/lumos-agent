# Chat Workspace

## Overview

The authenticated application now centers on a chatbot workspace instead of the old authenticated marketing homepage.

Route layout:

- `/`: public about page
- `/auth`: public login / registration
- `/chat`: protected workspace shell + new conversation view
- `/chat/:id`: protected workspace shell + conversation view

The authenticated shell now opens settings through an in-place modal instead of a dedicated `/settings/*` route.

The protected shell is intentionally thin: top navigation, locale switcher, settings entry, logout, conversation sidebar, history slideover, and chat-scoped modals.
The actual chat canvas is rendered by nested child routes:

- `/chat` always means a blank "new conversation" workspace
- `/chat/:id` always means the selected conversation workspace

The parent `/chat` route owns shared workspace state so draft input, runtime selection, and stream control survive child-route switches.
Conversation history is still available, but no longer stays pinned on the main canvas by default.

The parent route is also the only orchestration entry for chat UI state. Child route views and leaf components should receive explicit props and emit explicit events instead of reaching into injected chat state.

## Startup and Routing

The renderer bootstraps through `app.getBootstrap()`.

Routing rules:

- unauthenticated users can browse `/` and `/auth`
- authenticated users are redirected away from `/auth`
- `/chat` requires both authentication and a usable provider
- `/chat/:id` uses the same auth / provider gate as `/chat`
- authenticated users without a usable provider stay on `/chat`, where the settings modal remains available from the shell
- legacy `#/chat?conversationId=123` links are immediately normalized to `#/chat/123`
- invalid, deleted, or inaccessible conversation ids fall back to `#/chat`

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
- invocation metadata snapshot
- per-message runtime snapshot
- stable sequence ordering

That structure now carries assistant/toolResult history, MCP/skill activation snapshots, and explicit slash-skill wake-up metadata without changing the storage model again.

## Renderer Composition

Main renderer state boundaries:

- `useAppBootstrap`: app-level auth bootstrap and logout
- `useProviderSettings`: shared provider configuration state used by the chat workspace and provider settings UI
- `useMcpSettings`: shared MCP settings state used by the settings modal
- `useSkillSettings`: shared managed-skill settings state used by the settings modal and slash wake-up UI
- `src/renderer/composables/chat/createChatWorkspace.ts`: chat feature composition root
- `src/renderer/composables/chat/chat-route-state.ts`: URL normalization, selection sync, and invalid conversation fallback
- `src/renderer/composables/chat/chat-runtime-state.ts`: model / provider selection and runtime config persistence
- `src/renderer/composables/chat/chat-messaging-state.ts`: send / stop actions and stream-to-detail synchronization
- `src/renderer/composables/chat/createConversationListState.ts`: instance-scoped conversation list state
- `src/renderer/composables/chat/createConversationDetailState.ts`: instance-scoped active conversation detail state
- `src/renderer/composables/chat/createChatStreamState.ts`: instance-scoped streaming state and abort handling

Main UI surfaces:

- `AuthenticatedFrame`: protected application shell
- `src/renderer/pages/chat.vue`: parent workspace shell and the only chat orchestration entry; wires sidebar, mobile header, route view props, and chat actions
- `src/renderer/pages/chat/index.vue`: new conversation route wrapper; passes explicit composer props/events into `ChatNewConversationView`
- `src/renderer/pages/chat/[id].vue`: conversation route wrapper; passes explicit conversation/composer props/events into `ChatConversationView`
- `ChatNewConversationView`: new conversation title + centered composer surface
- `ChatConversationView`: loading / message-list conversation surface + footer composer slot
- `ChatInputPanel`: composer UI contract (`v-model:composerValue`, `runtime-change`, `send`, `stop`) plus slash-skill wake-up suggestions
- `ChatHistorySlideover`: on-demand conversation history panel
- `ConversationSidebar`: conversation CRUD and selection inside the history panel
- `MessageBubble`: user / assistant / toolResult rendering through `markstream-vue`
- `ProviderSettingsView`: provider configuration UI
- `McpSettingsView`: MCP activation / inspect UI
- `SkillSettingsView`: managed skill activation / detail UI

Data-flow rules for chat:

- `src/renderer/pages/chat.vue` owns the workspace instance and passes view data down.
- Route pages stay thin and should not create or inject chat state.
- Leaf chat components should emit events upward instead of mutating shared state directly.
- Only composables under `src/renderer/composables/chat/` may talk to chat oRPC endpoints or coordinate streaming side effects.

## Streaming and Failure Handling

Chat streaming events:

- `started`
- `assistant_patch`
- `tool_execution_start`
- `tool_execution_update`
- `tool_execution_end`
- `message_persisted`
- `completed`
- `failed`

Chat execution expectations:

- globally enabled MCP servers stay available to every request
- globally enabled skills are exposed as skill tools
- `/skill-name` explicitly wakes one enabled skill for a single request
- tool execution state is rendered while the request is in flight
- assistant and toolResult messages are persisted incrementally through `message_persisted`

Failure handling expectations:

- keep partial assistant output visible when possible
- persist failure state into history instead of silently dropping it
- render persisted assistant error messages inside the message bubble, not only as transient page alerts
- recover from deleted conversations, invalid ids, or missing selections by falling back to `/chat`
- surface oRPC and provider failures as visible UI messages
- allow switching away from a streaming conversation without canceling the active response; show the active stream state in the conversation list
