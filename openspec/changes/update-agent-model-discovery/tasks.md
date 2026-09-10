## 1. Model discovery contract
- [x] 1.1 Define shared normalized model and reasoning capability types.
- [x] 1.2 Add Claude and Codex discovery procedures with safe fallbacks.

## 2. Provider integration
- [x] 2.1 Drive Codex selection using legacy model/reasoning entries advertised by the current ACP session.
- [ ] 2.2 Replace or upgrade the AI SDK-to-ACP bridge for ACP SDK 1.4 `configOptions` support.
- [ ] 2.3 Migrate from archived `@zed-industries/codex-acp` to maintained `@agentclientprotocol/codex-acp`.
- [ ] 2.4 Apply model, reasoning effort, and fast mode through `session/set_config_option`.
- [ ] 2.5 Smoke-test Codex ChatGPT auth, API-key auth, and resumed sessions.
- [x] 2.6 Keep the Claude Agent SDK and bundled CLI aligned and use its supported-model discovery.

## 3. Renderer
- [x] 3.1 Replace hardcoded selector input with discovered model catalogs.
- [x] 3.2 Migrate unavailable stored selections to the provider current or first advertised model.
- [x] 3.3 Preserve loading, offline, and authentication-failure fallbacks.

## 4. Verification
- [x] 4.1 Add model normalization and stale-selection tests.
- [ ] 4.2 Perform a desktop smoke test of new-chat, active-chat, resumed-session, and settings selectors.
- [x] 4.3 Run tests and the production build; direct `tsc` still reports the repository's pre-existing baseline errors.
