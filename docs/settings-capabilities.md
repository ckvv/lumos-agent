# Settings Center and Global Capabilities

## Overview

The authenticated workspace now exposes one unified settings modal instead of a provider-only entry.

Settings tabs:

- `Providers`: existing provider configuration flows
- `MCP`: persistent MCP server management
- `Skills`: persistent managed skill management

There is no dedicated `/settings/*` route. The entry lives in the authenticated user menu and opens an in-workspace modal.

## MCP Lifecycle

MCP server state is stored in SQLite table `mcp_servers`.

Each row persists:

- safe config (`transport`, command/args/cwd or URL)
- encrypted secret payload (`env` for stdio, `headers` for Streamable HTTP)
- enabled flag
- latest inspection snapshot
- latest error / last checked timestamp

Behavior:

- enabling an MCP server means global activation
- globally activated MCP servers are connected in the main process and exposed to every later chat request
- chat does not persist raw secrets back to the renderer; only env/header keys are returned
- if an enabled MCP server cannot reconnect for a chat request, the request fails fast instead of silently dropping the capability

Chat exposes active MCP capabilities as:

- one tool per MCP tool
- one wrapper tool for `list_resources`
- one wrapper tool for `read_resource`
- one wrapper tool for `list_prompts`
- one wrapper tool for `get_prompt`

## Managed Skills

Managed skills live under the app-owned workspace:

- `app.getPath('userData')/agent-project/.pi/skills`

Skill activation state is stored in SQLite table `managed_skills`.

Behavior:

- enabling a skill means global activation for later chat requests
- active skills are exposed to chat as skill tools
- `/skill-name` at the start of the composer triggers a one-request explicit wake-up
- explicit wake-up strips the slash prefix from the persisted user message and records the choice in invocation metadata
- a skill with frontmatter `disable-model-invocation: true` stays available for explicit wake-up, but is not exposed for autonomous invocation unless explicitly requested

## Chat Streaming Contract

Chat now runs through `@mariozechner/pi-agent-core` instead of a direct `pi-ai stream()` call.

Streaming events:

- `started`
- `assistant_patch`
- `tool_execution_start`
- `tool_execution_update`
- `tool_execution_end`
- `message_persisted`
- `completed`
- `failed`

`conversation_messages` now store:

- raw `message_json`
- `runtime_snapshot_json`
- `invocation_metadata_json`

Invocation metadata records:

- active MCP servers at send time
- active skills at send time
- explicit slash-triggered skill, if present

The renderer uses that data to show:

- tool execution timeline while the agent is running
- persisted `toolResult` messages in history
- explicit skill badges on user messages
