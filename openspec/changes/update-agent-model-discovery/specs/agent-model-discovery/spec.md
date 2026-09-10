## ADDED Requirements

### Requirement: Provider-backed model catalog
Instructor SHALL populate each AI provider's model selector from capabilities reported for the active authentication context.

#### Scenario: Provider discovery succeeds
- **WHEN** an authenticated provider reports its available models
- **THEN** Instructor shows those models and their supported configuration options

#### Scenario: Provider discovery is unavailable
- **WHEN** model discovery fails, is offline, or requires authentication
- **THEN** Instructor remains usable with a current fallback catalog and does not block chat startup

### Requirement: Valid model selection
Instructor MUST validate persisted and requested model selections against the active provider catalog.

#### Scenario: Stored model was retired
- **WHEN** the previously selected model is absent from the active catalog
- **THEN** Instructor selects the provider-reported current model or first available model and persists the replacement

#### Scenario: Reasoning configuration changes by model
- **WHEN** the selected model exposes a specific set of reasoning levels
- **THEN** Instructor offers only those levels and sends the selected supported value

### Requirement: Current provider adapters
Instructor SHALL use maintained provider adapters capable of reporting and applying current model configuration.

#### Scenario: Codex starts a new or resumed session
- **WHEN** Instructor connects to Codex through ACP
- **THEN** it applies the selected model and reasoning configuration using the mechanism advertised by that session
