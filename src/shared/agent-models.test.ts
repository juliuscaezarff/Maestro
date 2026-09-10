import { describe, expect, it } from "bun:test"

import {
  FALLBACK_CODEX_MODELS,
  getCodexModelId,
  normalizeAdvertisedCodexModels,
  resolveAvailableModel,
} from "./agent-models"

describe("agent model catalogs", () => {
  it("uses the maintained fallback catalog when ACP discovery is unavailable", () => {
    expect(normalizeAdvertisedCodexModels(undefined)).toEqual(
      FALLBACK_CODEX_MODELS,
    )
    expect(FALLBACK_CODEX_MODELS.map((model) => model.id)).not.toContain(
      "gpt-5.2-codex",
    )
  })

  it("groups legacy ACP model IDs by reasoning effort", () => {
    const models = normalizeAdvertisedCodexModels([
      { modelId: "gpt-example/low", name: "GPT Example (Low)" },
      { modelId: "gpt-example/high", name: "GPT Example (High)" },
    ])

    expect(models).toEqual([
      {
        id: "gpt-example",
        name: "GPT Example",
        thinkings: ["low", "high"],
        thinkingInModelId: true,
      },
    ])
    expect(getCodexModelId(models[0]!, "high")).toBe("gpt-example/high")
  })

  it("keeps modern ACP model IDs unchanged", () => {
    const models = normalizeAdvertisedCodexModels([
      { modelId: "gpt-6-astra", name: "GPT-6 Astra" },
    ])

    expect(getCodexModelId(models[0]!, "high")).toBe("gpt-6-astra")
  })

  it("migrates a stale selection to the first available provider model", () => {
    const models = [{ id: "current-model" }, { id: "other-model" }]

    expect(resolveAvailableModel(models, "retired-model")).toEqual(models[0])
    expect(resolveAvailableModel(models, "other-model")).toEqual(models[1])
  })
})
