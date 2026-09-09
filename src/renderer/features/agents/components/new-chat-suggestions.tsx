import {
  Bug,
  FlaskConical,
  Package,
  Search,
  type LucideProps,
} from "lucide-react"
import type { ComponentType } from "react"
import { GitHubIcon } from "../../../components/ui/icons"
import { LinearIcon } from "../../automations/_components"

const LinearBrandIcon = ({ className, "aria-hidden": ariaHidden }: LucideProps) => (
  <span aria-hidden={ariaHidden} className={className}>
    <LinearIcon className="h-full w-full" />
  </span>
)

type Suggestion = {
  id: string
  label: string
  prompt: string
  icon: ComponentType<LucideProps>
}

const localSuggestions: Suggestion[] = [
  {
    id: "review-project",
    label: "Review this project and suggest the next improvement",
    prompt:
      "Review this project, identify the most valuable improvement we can make next, and explain why it should be prioritized.",
    icon: Search,
  },
  {
    id: "fix-bug",
    label: "Find and fix a bug in the current codebase",
    prompt:
      "Inspect the current codebase, find a meaningful bug, implement a focused fix, and verify the result.",
    icon: Bug,
  },
  {
    id: "add-tests",
    label: "Add tests for an untested part of this project",
    prompt:
      "Find an important part of this project that lacks test coverage, add tests in the existing project style, and run the relevant checks.",
    icon: FlaskConical,
  },
  {
    id: "update-dependencies",
    label: "Update dependencies and run the project checks",
    prompt:
      "Review this project's dependencies, make safe and useful updates, then run the relevant tests, typecheck, and lint checks.",
    icon: Package,
  },
]

const integrationSuggestions: Record<"linear" | "github", Suggestion> = {
  linear: {
    id: "create-linear-task",
    label: "Create a Linear task from this project context",
    prompt:
      "Create a Linear task based on the current project context. Draft a clear title, description, and acceptance criteria, then ask me to confirm any missing details before creating it.",
    icon: LinearBrandIcon,
  },
  github: {
    id: "review-pull-requests",
    label: "Review the open pull requests and summarize what needs attention",
    prompt:
      "Review the open GitHub pull requests for this project and summarize what needs attention, including risks, failing checks, and the recommended next action.",
    icon: GitHubIcon,
  },
}

type NewChatSuggestionsProps = {
  hasLinear: boolean
  hasGitHub: boolean
  onSelect: (prompt: string) => void
}

export function NewChatSuggestions({
  hasLinear,
  hasGitHub,
  onSelect,
}: NewChatSuggestionsProps) {
  const suggestions = [
    ...localSuggestions,
    ...(hasLinear ? [integrationSuggestions.linear] : []),
    ...(hasGitHub ? [integrationSuggestions.github] : []),
  ]

  return (
    <section aria-labelledby="new-chat-suggestions-title" className="pt-5 sm:pt-7">
      <h2
        id="new-chat-suggestions-title"
        className="px-1 text-sm font-medium text-muted-foreground"
      >
        Suggested actions
      </h2>
      <div className="mt-2 flex flex-col">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon

          return (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => onSelect(suggestion.prompt)}
              className="group flex min-h-10 w-full items-start gap-3 rounded-lg px-1 py-2 text-left text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Icon
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-90"
                strokeWidth={1.75}
              />
              <span className="leading-5">{suggestion.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
