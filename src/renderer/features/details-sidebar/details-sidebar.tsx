"use client"

import type { ReactNode } from "react"
import { useAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { useResolvedHotkeyDisplay } from "@/lib/hotkeys"
import { detailsSidebarOpenAtom } from "./atoms"
import { ToolPanel } from "./tool-panel"
import { useToolPanel } from "./use-tool-panel"
import { type ToolId, type ToolTab } from "./tool-panel-state"
import { InfoSection } from "./sections/info-section"
import { TodoWidget } from "./sections/todo-widget"
import { FilesTab } from "./sections/files-tab"
import { FileViewerSidebar } from "../file-viewer/components/file-viewer-sidebar"
import {
  diffViewDisplayModeAtom,
  fileViewerDisplayModeAtom,
} from "../agents/atoms"

function EmptyTool({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground"
      role="status"
    >
      {children}
    </div>
  )
}

interface DetailsSidebarProps {
  terminalContent?: (tab: Extract<ToolTab, { type: "terminal" }>) => ReactNode
  diffContent?: ReactNode
  planContent?: ReactNode
  /** Workspace/chat ID */
  chatId: string
  /** Worktree path for terminal */
  worktreePath: string | null
  /** Plan path for plan section */
  planPath: string | null
  /** Active sub-chat ID for plan */
  activeSubChatId?: string | null
  /** Remote chat info for sandbox workspaces */
  remoteInfo?: {
    repository?: string
    branch?: string | null
    sandboxId?: string
  } | null
  /** Whether this is a remote sandbox chat (no local worktree) */
  isRemoteChat?: boolean
}

export function DetailsSidebar(props: DetailsSidebarProps) {
  const {
    chatId,
    worktreePath,
    isRemoteChat,
    remoteInfo,
    activeSubChatId,
    planPath,
    terminalContent,
    diffContent,
    planContent,
  } = props
  const panel = useToolPanel(chatId)
  const [isOpen, setIsOpen] = useAtom(detailsSidebarOpenAtom)
  const [diffMode, setDiffMode] = useAtom(diffViewDisplayModeAtom)
  const [fileMode, setFileMode] = useAtom(fileViewerDisplayModeAtom)
  const terminalHotkey = useResolvedHotkeyDisplay("toggle-terminal")
  const diffHotkey = useResolvedHotkeyDisplay("open-diff")
  const filesHotkey = useResolvedHotkeyDisplay("file-search")
  const toggleHotkey = useResolvedHotkeyDisplay("toggle-details")
  const local = !!worktreePath && !isRemoteChat
  const unavailable = (id: ToolId) =>
    !local && (id === "terminal" || id === "files")
  const select = (tab: ToolTab) => {
    if (tab.type === "diff") setDiffMode("side-peek")
    if (tab.type === "file") setFileMode("side-peek")
    panel.selectTab(tab.id)
  }
  const openTool = (id: ToolId) => {
    if (id === "terminal") {
      return panel.createTerminal()
    }
    if (id === "diff") setDiffMode("side-peek")
    return panel.openTool(id)
  }
  const content = (tab: ToolTab) => {
    switch (tab.type) {
      case "info":
        return (
          <div className="overflow-auto p-2">
            <InfoSection
              chatId={chatId}
              worktreePath={worktreePath}
              remoteInfo={remoteInfo}
              isExpanded
            />
          </div>
        )
      case "todo":
        return (
          <div className="overflow-auto py-2">
            <TodoWidget subChatId={activeSubChatId || null} showEmpty />
          </div>
        )
      case "plan":
        return planPath ? (
          planContent
        ) : (
          <EmptyTool>
            No plan yet. Ask the agent to create a plan in this chat.
          </EmptyTool>
        )
      case "terminal":
        return !local ? (
          <EmptyTool>Terminal requires a local workspace.</EmptyTool>
        ) : tab.position === "bottom" ? (
          <EmptyTool>
            <Button
              variant="ghost"
              onClick={() => panel.setTerminalPosition(tab.id, "side-peek")}
            >
              Move terminal to this panel
            </Button>
          </EmptyTool>
        ) : (
          terminalContent?.(tab)
        )
      case "files":
        return !local ? (
          <EmptyTool>Files requires a local workspace.</EmptyTool>
        ) : (
          <FilesTab
            worktreePath={worktreePath}
            onSelectFile={(path) => {
              setFileMode("side-peek")
              panel.openFile(path)
            }}
            currentViewerFilePath={
              panel.activeTab?.type === "file" ? panel.activeTab.path : null
            }
            className="flex-1 min-h-0"
          />
        )
      case "file":
        return !local ? (
          <EmptyTool>Open a local workspace to view this file.</EmptyTool>
        ) : fileMode !== "side-peek" ? (
          <EmptyTool>
            <Button variant="ghost" onClick={() => setFileMode("side-peek")}>
              Show file in this panel
            </Button>
          </EmptyTool>
        ) : (
          <FileViewerSidebar
            isActive={panel.activeId === tab.id && isOpen}
            filePath={tab.path}
            projectPath={worktreePath!}
            onClose={() => panel.closeTab(tab.id)}
          />
        )
      case "diff":
        return diffMode === "side-peek" ? (
          diffContent || <EmptyTool>No changes to review.</EmptyTool>
        ) : (
          <EmptyTool>
            <Button
              variant="ghost"
              onClick={() => setDiffMode("side-peek")}
            >
              Show changes in this panel
            </Button>
          </EmptyTool>
        )
    }
  }
  return (
    <ToolPanel
      panel={panel}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSelect={select}
      onOpenTool={openTool}
      unavailable={unavailable}
      renderContent={content}
      terminalHotkey={terminalHotkey}
      diffHotkey={diffHotkey}
      filesHotkey={filesHotkey}
      toggleHotkey={toggleHotkey}
    />
  )
}
