# Change: Discover current AI models dynamically

## Why
Instructor currently exposes hardcoded Claude and Codex model lists. Those lists drift from the authenticated agents, leaving retired models selectable and newly available models hidden.

## What Changes
- Discover Claude models from the Claude Agent SDK for the active authentication context.
- Discover Codex models and reasoning options from the ACP session instead of relying on a frontend-only catalog.
- Keep a small current fallback catalog for startup, offline, and authentication failures.
- Migrate stale stored selections to the provider's current default.
- Update the Codex ACP integration to the maintained adapter and current configuration mechanism where compatibility permits.

## Impact
- Affected specs: `agent-model-discovery`
- Affected code: agent model state, model selectors, Claude router, Codex router, ACP dependencies, and model-selection tests.

## Implementation Status

### Delivered on `fix/agent-model-discovery`
- Shared normalized Claude/Codex model types and current emergency fallbacks.
- Claude discovery through `Query.supportedModels()` using the active authentication environment.
- Codex discovery through the legacy ACP session's advertised `models.availableModels`.
- A five-minute renderer cache, a 15-second backend timeout, and non-blocking fallback behavior.
- One catalog shared by settings, new chat, active chat, and the non-React Codex transport.
- Migration of a stale stored selection to an available model.
- Unit coverage for fallback, legacy reasoning IDs, modern plain IDs, and stale selections.

### Still required for full Codex app parity
- Replace the archived `@zed-industries/codex-acp` adapter with maintained `@agentclientprotocol/codex-acp`.
- Replace or upgrade `@mcpc-tech/acp-ai-provider`, which currently depends on ACP SDK 0.4.9, reads `models.availableModels`, and calls the removed `session/set_model` path.
- Read current ACP `configOptions` and apply model, reasoning effort, and fast mode through `session/set_config_option`.
- Smoke-test ChatGPT subscription auth, API-key auth, new sessions, and resumed sessions.

The delivered work removes the renderer's hardcoded source of truth, but it does not guarantee that the archived Codex adapter advertises the same catalog as the current Codex app.
