export type ClaudeModelOption = {
  id: string
  name: string
  version: string
  description?: string
}

export const CODEX_THINKING_LEVELS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
] as const

export type CodexThinkingLevel = (typeof CODEX_THINKING_LEVELS)[number]

export type CodexModelOption = {
  id: string
  name: string
  description?: string
  thinkings: CodexThinkingLevel[]
  thinkingInModelId: boolean
}

export const FALLBACK_CLAUDE_MODELS: ClaudeModelOption[] = [
  { id: "opus", name: "Opus", version: "" },
  { id: "sonnet", name: "Sonnet", version: "" },
  { id: "haiku", name: "Haiku", version: "" },
]

// This list is only used while provider discovery is unavailable. Keep IDs as
// plain model IDs because the legacy ACP bridge cannot set modern config options.
export const FALLBACK_CODEX_MODELS: CodexModelOption[] = [
  {
    id: "gpt-6-astra",
    name: "GPT-6 Astra",
    thinkings: ["high"],
    thinkingInModelId: false,
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    thinkings: ["high"],
    thinkingInModelId: false,
  },
  {
    id: "gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    thinkings: ["high"],
    thinkingInModelId: false,
  },
  {
    id: "gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    thinkings: ["high"],
    thinkingInModelId: false,
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    thinkings: ["high"],
    thinkingInModelId: false,
  },
]

export type AdvertisedCodexModel = {
  modelId: string
  name: string
  description?: string | null
}

export function resolveAvailableModel<T extends { id: string }>(
  models: T[],
  selectedId: string,
): T | undefined {
  return models.find((model) => model.id === selectedId) ?? models[0]
}

export function normalizeAdvertisedCodexModels(
  advertised: AdvertisedCodexModel[] | null | undefined,
): CodexModelOption[] {
  if (!advertised?.length) return FALLBACK_CODEX_MODELS

  const groups = new Map<string, CodexModelOption>()
  const thinkingPattern = new RegExp(
    `/(${CODEX_THINKING_LEVELS.join("|")})$`,
  )

  for (const item of advertised) {
    const match = item.modelId.match(thinkingPattern)
    const thinking = match?.[1] as CodexThinkingLevel | undefined
    const id = thinking ? item.modelId.slice(0, -match![0].length) : item.modelId
    const existing = groups.get(id)

    if (existing) {
      if (thinking && !existing.thinkings.includes(thinking)) {
        existing.thinkings.push(thinking)
      }
      existing.thinkingInModelId ||= Boolean(thinking)
      continue
    }

    groups.set(id, {
      id,
      name: item.name.replace(/\s*[(/-]\s*(?:none|minimal|low|medium|high|xhigh|max|ultra)\)?$/i, ""),
      ...(item.description ? { description: item.description } : {}),
      thinkings: thinking ? [thinking] : ["high"],
      thinkingInModelId: Boolean(thinking),
    })
  }

  return [...groups.values()]
}

export function getCodexModelId(
  model: CodexModelOption,
  thinking: CodexThinkingLevel,
): string {
  return model.thinkingInModelId ? `${model.id}/${thinking}` : model.id
}

export function formatCodexThinkingLabel(thinking: CodexThinkingLevel): string {
  if (thinking === "xhigh") return "Extra High"
  return thinking.charAt(0).toUpperCase() + thinking.slice(1)
}
