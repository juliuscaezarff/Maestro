## Context
Claude and Codex both expose model metadata at runtime, but Instructor currently duplicates model IDs and capabilities in the renderer. Codex also uses the archived `@zed-industries/codex-acp` adapter and an ACP provider built around the former model-selection fields.

## Goals / Non-Goals
- Goals: show models available to the authenticated user, select supported reasoning levels, survive discovery failures, and remove retired defaults.
- Non-Goals: change billing, authentication semantics, provider permissions, or stored chat history.

## Decisions
- Treat the provider or agent session as the source of truth and normalize its response into a shared UI model shape.
- Cache discovery through tRPC/React Query and use a static catalog only as a fallback.
- Validate a stored selection against the discovered catalog before sending a turn.
- Keep Claude SDK and its bundled Claude Code executable on matching versions.
- Prefer the maintained `@agentclientprotocol/codex-acp` adapter; if the existing AI SDK bridge cannot drive its config options safely, isolate that adapter migration behind the same normalized discovery contract.

## Implemented Boundary

The first migration stage is complete: provider results are normalized behind tRPC and consumed consistently throughout the renderer. The Codex implementation currently understands the legacy ACP response, including reasoning levels encoded as `<model>/<effort>`, and also accepts plain modern model IDs.

The adapter migration is intentionally not part of the completed stage. The maintained Codex adapter uses `@agentclientprotocol/sdk` 1.4 and exposes selectable values through `configOptions`. Instructor's current AI SDK bridge resolves ACP SDK 0.4.9, reads the former `models` field, and selects models through the former `setSessionModel` method. Updating only the adapter package would make model selection and potentially streamed events incompatible.

Full parity therefore requires upgrading or replacing the bridge and validating its streamed event conversion before switching the executable. The normalized catalog introduced here is the compatibility boundary for that work.

## Risks / Trade-offs
- Discovery can require authentication or network access, so the UI needs a non-blocking fallback.
- ACP model configuration changed across protocol generations, so adapter migration must be verified with new and resumed sessions.
- SDK upgrades can change streamed event shapes; existing chat and tool rendering require regression tests.

## Migration Plan
Introduce the normalized discovery API first, migrate selectors and stored preferences, then update provider packages behind that API. Preserve the old fallback until both authentication modes pass smoke tests.

## Verification Record

- `bun test src/shared/agent-models.test.ts`: 4 passed, 0 failed.
- `npm run build`: passed.
- Direct TypeScript compilation was attempted and remains red because of existing repository-wide baseline errors unrelated to this change.
- End-to-end model parity was not claimed because the current archived adapter could not be initialized in the isolated shell diagnostic and the desktop UI smoke test remains pending.
