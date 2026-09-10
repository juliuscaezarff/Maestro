import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"

import {
  codexApiKeyAtom,
  customClaudeConfigAtom,
  normalizeCodexApiKey,
  normalizeCustomClaudeConfig,
  showOfflineModeFeaturesAtom,
} from "../../../lib/atoms"
import { trpc } from "../../../lib/trpc"
import { CLAUDE_MODELS, CODEX_MODELS } from "../lib/models"
import { availableCodexModelsAtom } from "../atoms"

export function useAvailableAgentModels() {
  const setAvailableCodexModels = useSetAtom(availableCodexModelsAtom)
  const showOfflineFeatures = useAtomValue(showOfflineModeFeaturesAtom)
  const customClaudeConfig = useAtomValue(customClaudeConfigAtom)
  const codexApiKey = useAtomValue(codexApiKeyAtom)
  const normalizedClaudeConfig = normalizeCustomClaudeConfig(customClaudeConfig)
  const normalizedCodexApiKey = normalizeCodexApiKey(codexApiKey)

  const { data: claudeCatalog, isLoading: isClaudeLoading } =
    trpc.claude.getModels.useQuery(
      normalizedClaudeConfig
        ? { customConfig: normalizedClaudeConfig }
        : undefined,
      { retry: false, staleTime: 5 * 60 * 1000 },
    )
  const { data: codexCatalog, isLoading: isCodexLoading } =
    trpc.codex.getModels.useQuery(
      normalizedCodexApiKey
        ? { authConfig: { apiKey: normalizedCodexApiKey } }
        : undefined,
      { retry: false, staleTime: 5 * 60 * 1000 },
    )
  const { data: ollamaStatus } = trpc.ollama.getStatus.useQuery(undefined, {
    refetchInterval: showOfflineFeatures ? 30000 : false,
    enabled: showOfflineFeatures,
  })

  const isOffline = ollamaStatus ? !ollamaStatus.internet.online : false
  const hasOllama = Boolean(
    ollamaStatus?.ollama.available && ollamaStatus.ollama.models?.length,
  )
  const exposeOllama = showOfflineFeatures && hasOllama && isOffline
  const codexModels = codexCatalog?.models ?? CODEX_MODELS

  useEffect(() => {
    setAvailableCodexModels(codexModels)
  }, [codexModels, setAvailableCodexModels])

  return {
    models: claudeCatalog?.models ?? CLAUDE_MODELS,
    codexModels,
    ollamaModels: exposeOllama ? ollamaStatus?.ollama.models ?? [] : [],
    recommendedModel: exposeOllama
      ? ollamaStatus?.ollama.recommendedModel
      : undefined,
    isOffline,
    hasOllama: exposeOllama,
    isLoading: isClaudeLoading || isCodexLoading,
    sources: {
      claude: claudeCatalog?.source ?? "fallback",
      codex: codexCatalog?.source ?? "fallback",
    },
  }
}
