"use client"

import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { GitCommit, GitPullRequest } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import { AnimatePresence, motion } from "motion/react"
import {
  IconSpinner,
} from "../../../components/ui/icons"
import {
  extractGitActivity,
  extractChangedFiles,
  buildUnifiedDiffFromEdits,
  type ChangedFileInfo,
} from "../utils/git-activity"
import {
  selectedProjectAtom,
  diffSidebarOpenAtomFamily,
  filteredDiffFilesAtom,
  filteredSubChatIdAtom,
  selectedCommitAtom,
  diffActiveTabAtom,
} from "../atoms"
import { cn } from "../../../lib/utils"
import { useFileOpen } from "../mentions"
import { PatchDiff } from "@pierre/diffs/react"
import { useCodeTheme } from "../../../lib/hooks/use-code-theme"
import { getShikiTheme } from "../../../lib/themes/diff-view-highlighter"
import { useTheme } from "next-themes"
import { PIERRE_DIFFS_THEME_CSS } from "./agent-diff-view"

/** Mini bar chart showing additions/deletions ratio as colored bars */
function DiffMiniBar({ additions, deletions }: { additions: number; deletions: number }) {
  const total = additions + deletions
  if (total === 0) return null

  const maxBars = 5
  const addBars = Math.max(additions > 0 ? 1 : 0, Math.round((additions / total) * maxBars))
  const delBars = Math.max(deletions > 0 ? 1 : 0, maxBars - addBars)

  return (
    <div className="flex items-center gap-px ml-1">
      {Array.from({ length: addBars }).map((_, i) => (
        <div key={`a${i}`} className="w-[3px] h-3 rounded-[1px] bg-green-500 dark:bg-green-400" />
      ))}
      {Array.from({ length: delBars }).map((_, i) => (
        <div key={`d${i}`} className="w-[3px] h-3 rounded-[1px] bg-red-500 dark:bg-red-400" />
      ))}
    </div>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={cn("w-3.5 h-3.5 text-muted-foreground", className)} viewBox="0 0 16 16">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

/** Deferred PatchDiff — no height limit, grows to full size */
const InlineFileDiff = memo(function InlineFileDiff({
  file,
  shikiTheme,
  isLight,
}: {
  file: ChangedFileInfo
  shikiTheme: any
  isLight: boolean
}) {
  const [ready, setReady] = useState(false)

  const diffText = useMemo(
    () => buildUnifiedDiffFromEdits(file.displayPath, file.edits),
    [file.displayPath, file.edits],
  )

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!diffText) return null

  if (!ready) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
        <IconSpinner className="size-3.5" />
        <span>Loading diff…</span>
      </div>
    )
  }

  return (
    <div className="text-xs [&_[data-diffs]]:!text-xs">
      <PatchDiff
        patch={diffText}
        options={{
          diffStyle: "unified",
          diffIndicators: "bars",
          themeType: isLight ? "light" : "dark",
          overflow: "scroll",
          disableFileHeader: true,
          theme: shikiTheme,
          unsafeCSS: PIERRE_DIFFS_THEME_CSS,
        }}
      />
    </div>
  )
})

/** Single file row inside the expanded file list */
const FileRow = memo(function FileRow({
  file,
  shikiTheme,
  isLight,
}: {
  file: ChangedFileInfo
  shikiTheme: any
  isLight: boolean
}) {
  const [isDiffOpen, setIsDiffOpen] = useState(false)
  const hasEdits = file.edits.length > 0

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => hasEdits && setIsDiffOpen(!isDiffOpen)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && hasEdits) {
            e.preventDefault()
            setIsDiffOpen(!isDiffOpen)
          }
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-xs",
          hasEdits ? "cursor-pointer hover:bg-muted/50 transition-colors" : "cursor-default",
        )}
      >
        <span className="truncate flex-1 text-foreground/90">{file.displayPath}</span>
        <span className="flex-shrink-0 text-green-600 dark:text-green-400">+{file.additions}</span>
        <span className="flex-shrink-0 text-red-600 dark:text-red-400">-{file.deletions}</span>
        {hasEdits && (
          <ChevronRight
            className={cn(
              "transition-transform duration-150 flex-shrink-0",
              isDiffOpen && "rotate-90",
            )}
          />
        )}
      </div>

      {/* Diff expand — no height limit */}
      <AnimatePresence initial={false}>
        {isDiffOpen && hasEdits && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <InlineFileDiff file={file} shikiTheme={shikiTheme} isLight={isLight} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

interface GitActivityBadgesProps {
  parts: any[]
  chatId: string
  subChatId: string
}

export const GitActivityBadges = memo(function GitActivityBadges({
  parts,
  chatId,
  subChatId,
}: GitActivityBadgesProps) {
  const selectedProject = useAtomValue(selectedProjectAtom)
  const setDiffSidebarOpen = useSetAtom(diffSidebarOpenAtomFamily(chatId))
  const setFilteredDiffFiles = useSetAtom(filteredDiffFilesAtom)
  const setFilteredSubChatId = useSetAtom(filteredSubChatIdAtom)
  const setSelectedCommit = useSetAtom(selectedCommitAtom)
  const setDiffActiveTab = useSetAtom(diffActiveTabAtom)

  const [isExpanded, setIsExpanded] = useState(false)

  // Theme resolution for PatchDiff (read once, passed down)
  const codeTheme = useCodeTheme()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === "light"
  const shikiTheme = useMemo(
    () => getShikiTheme(codeTheme, !isLight),
    [codeTheme, isLight],
  )

  const activity = useMemo(() => extractGitActivity(parts), [parts])
  const changedFiles = useMemo(() => extractChangedFiles(parts, selectedProject?.path), [parts, selectedProject?.path])

  const totals = useMemo(() => {
    let additions = 0
    let deletions = 0
    for (const file of changedFiles) {
      additions += file.additions
      deletions += file.deletions
    }
    return { additions, deletions }
  }, [changedFiles])

  const handleOpenCommit = useCallback(() => {
    if (activity?.type !== "commit") return

    const owner = selectedProject?.gitOwner
    const repo = selectedProject?.gitRepo
    if (activity.pushed && activity.hash && owner && repo) {
      window.desktopApi.openExternal(
        `https://github.com/${owner}/${repo}/commit/${activity.hash}`,
      )
      return
    }

    if (activity.hash) {
      setSelectedCommit({
        hash: activity.hash,
        shortHash: activity.hash.slice(0, 8),
        message: activity.message,
      })
    }
    setFilteredDiffFiles(null)
    setFilteredSubChatId(subChatId)
    setDiffActiveTab("history")
    setDiffSidebarOpen(true)
  }, [activity, subChatId, selectedProject, setSelectedCommit, setFilteredDiffFiles, setFilteredSubChatId, setDiffActiveTab, setDiffSidebarOpen])

  if (!activity && changedFiles.length === 0) return null

  return (
    <div className="mx-2 mt-1.5 mb-1 flex flex-col gap-1.5">
      {/* Changed files — OpenCode style */}
      {changedFiles.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          {/* Level 1 header: "Modificado N arquivo(s) |||| ›" */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-2.5 h-8 cursor-pointer hover:bg-muted/50 transition-colors duration-150 text-xs"
          >
            <span className="font-medium text-foreground">Modified</span>
            <span className="text-muted-foreground">
              {changedFiles.length} {changedFiles.length === 1 ? "file" : "files"}
            </span>
            <DiffMiniBar additions={totals.additions} deletions={totals.deletions} />
            <div className="flex-1" />
            <ChevronRight
              className={cn(
                "transition-transform duration-150",
                isExpanded && "rotate-90",
              )}
            />
          </div>

          {/* Level 1 expand: file list */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-border">
                  {changedFiles.map((file) => (
                    <FileRow
                      key={file.filePath}
                      file={file}
                      shikiTheme={shikiTheme}
                      isLight={isLight}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Git activity badge — commit */}
      {activity?.type === "commit" && (
        <button
          onClick={handleOpenCommit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer overflow-hidden min-w-0"
        >
          <GitCommit className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{activity.message}</span>
        </button>
      )}

      {/* Git activity badge — PR */}
      {activity?.type === "pr" && (
        <button
          onClick={() => window.desktopApi.openExternal(activity.url)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer overflow-hidden min-w-0"
        >
          <GitPullRequest className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
          <span className="truncate">{activity.title}</span>
        </button>
      )}
    </div>
  )
})
