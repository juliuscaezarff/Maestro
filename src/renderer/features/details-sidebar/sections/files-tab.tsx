"use client"

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
  forwardRef,
  useImperativeHandle,
} from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { atom } from "jotai"
import {
  hotkeysCoreFeature,
  syncDataLoaderFeature,
  selectionFeature,
} from "@headless-tree/core"
import { useTree } from "@headless-tree/react"
import { FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { UnknownFileIcon } from "@/icons/framework-icons"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tree, TreeItem, TreeItemLabel } from "@/components/ui/tree"
import { RenameDialog } from "@/components/rename-dialog"
import { preferredEditorAtom } from "@/lib/atoms"
import { getAppOption } from "@/components/open-in-button"
import { getFileIconByExtension } from "../../agents/mentions/agents-file-mention"
import { fileSearchDialogOpenAtom } from "../../agents/atoms"
import { fileTreeExpandedAtomFamily } from "../atoms"

// ============================================================================
// Types
// ============================================================================

interface FileTreeItem {
  name: string
  children?: string[]
  /** full relative path, e.g. "src/app/page.tsx" */
  path: string
  type: "file" | "folder"
}

interface FilesTabProps {
  worktreePath: string | null
  onSelectFile: (filePath: string) => void
  onExpandedStateChange?: (allExpanded: boolean) => void
  /** Absolute path of the file currently open in file viewer (for highlight sync) */
  currentViewerFilePath?: string | null
  className?: string
}

export interface FilesTabHandle {
  toggleExpandCollapse: () => void
  openSearch: () => void
  /** true when all folders are expanded */
  isAllExpanded: boolean
}

// Static noop atom to avoid creating a family entry for "__noop__"
const noopExpandedAtom = atom<string[] | null, [string[]], void>(
  null,
  () => {},
)

const INDENT = 16

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a flat item map + children list from file paths.
 * Root node id = "__root__"
 */
function buildItemMap(
  files: Array<{ path: string; type: "file" | "folder" }>,
): Record<string, FileTreeItem> {
  const items: Record<string, FileTreeItem> = {
    __root__: { name: "__root__", children: [], path: "", type: "folder" },
  }

  for (const file of files) {
    if (file.type !== "file") continue
    const parts = file.path.split("/")
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1
      const pathSoFar = parts.slice(0, i + 1).join("/")
      if (!items[pathSoFar]) {
        items[pathSoFar] = {
          name: parts[i]!,
          path: pathSoFar,
          type: isLast ? "file" : "folder",
          children: isLast ? undefined : [],
        }
      }
      // Add as child of parent
      const parentKey = i === 0 ? "__root__" : parts.slice(0, i).join("/")
      const parent = items[parentKey]
      if (parent?.children && !parent.children.includes(pathSoFar)) {
        parent.children.push(pathSoFar)
      }
    }
  }

  // Sort each folder's children: folders first, then alphabetically
  for (const item of Object.values(items)) {
    if (item.children) {
      item.children.sort((a, b) => {
        const ia = items[a]!
        const ib = items[b]!
        if (ia.type !== ib.type) return ia.type === "folder" ? -1 : 1
        return ia.name.localeCompare(ib.name)
      })
    }
  }

  return items
}

function collectAllFolderIds(items: Record<string, FileTreeItem>): string[] {
  return Object.keys(items).filter(
    (k) => k !== "__root__" && items[k]!.type === "folder",
  )
}

function collectRootFolderIds(items: Record<string, FileTreeItem>): string[] {
  return (items["__root__"]?.children ?? []).filter(
    (k) => items[k]?.type === "folder",
  )
}

// ============================================================================
// FilesTab
// ============================================================================

export const FilesTab = memo(
  forwardRef<FilesTabHandle, FilesTabProps>(function FilesTab(
    {
      worktreePath,
      onSelectFile,
      onExpandedStateChange,
      currentViewerFilePath,
      className,
    },
    ref,
  ) {
    // activePath = file currently open in viewer (secondary highlight)
    const activePath = useMemo(() => {
      if (!currentViewerFilePath || !worktreePath) return null
      const prefix = worktreePath + "/"
      return currentViewerFilePath.startsWith(prefix)
        ? currentViewerFilePath.slice(prefix.length)
        : null
    }, [currentViewerFilePath, worktreePath])

    const setFileSearchOpen = useSetAtom(fileSearchDialogOpenAtom)

    // Persisted expanded paths
    const expandedAtom = useMemo(
      () =>
        worktreePath
          ? fileTreeExpandedAtomFamily(worktreePath)
          : noopExpandedAtom,
      [worktreePath],
    )
    const [storedExpanded, setStoredExpanded] = useAtom(expandedAtom)

    // Rename dialog state
    const [renameTarget, setRenameTarget] = useState<{
      id: string
      name: string
      type: "file" | "folder"
    } | null>(null)
    const [renameLoading, setRenameLoading] = useState(false)

    // Preferred editor
    const preferredEditor = useAtomValue(preferredEditorAtom)
    const editorLabel = useMemo(() => {
      const opt = getAppOption(preferredEditor)
      return opt.displayLabel ?? opt.label
    }, [preferredEditor])

    // tRPC
    const openInAppMutation = trpc.external.openInApp.useMutation()
    const openInFinderMutation = trpc.external.openInFinder.useMutation()
    const renameMutation = trpc.files.renameFile.useMutation()
    const deleteMutation = trpc.files.deleteFile.useMutation()
    const trpcUtils = trpc.useUtils()

    const { data: allFiles } = trpc.files.search.useQuery(
      { projectPath: worktreePath || "", query: "", limit: 5000, typeFilter: "file" },
      { enabled: !!worktreePath, staleTime: 10000 },
    )

    const itemMap = useMemo(() => {
      if (!allFiles) return null
      return buildItemMap(allFiles)
    }, [allFiles])

    // Auto-expand root folders on first visit
    useEffect(() => {
      if (itemMap && worktreePath && storedExpanded === null) {
        setStoredExpanded(collectRootFolderIds(itemMap))
      }
    }, [itemMap, worktreePath, storedExpanded, setStoredExpanded])

    const initialExpanded = useMemo(
      () => storedExpanded ?? [],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [], // intentionally only on mount
    )

    const tree = useTree<FileTreeItem>({
      rootItemId: "__root__",
      dataLoader: {
        getItem: (id) => itemMap?.[id] ?? { name: id, path: id, type: "file" },
        getChildren: (id) => itemMap?.[id]?.children ?? [],
      },
      features: [syncDataLoaderFeature, hotkeysCoreFeature, selectionFeature],
      getItemName: (item) => item.getItemData().name,
      isItemFolder: (item) =>
        (item.getItemData()?.children?.length ?? 0) > 0,
      indent: INDENT,
      initialState: {
        expandedItems: initialExpanded,
      },
    })

    // Sync expanded state to persistent storage whenever the tree changes
    const treeExpandedRef = useRef<string[]>([])
    useEffect(() => {
      if (!itemMap) return
      const expanded = tree
        .getItems()
        .filter((item) => item.isFolder?.() && item.isExpanded?.())
        .map((item) => item.getId())
      // Only update if changed
      const prev = treeExpandedRef.current
      if (
        prev.length !== expanded.length ||
        expanded.some((id, i) => id !== prev[i])
      ) {
        treeExpandedRef.current = expanded
        setStoredExpanded(expanded)
      }
    })

    // isAllExpanded: all folder ids are expanded
    const allFolderIds = useMemo(
      () => (itemMap ? collectAllFolderIds(itemMap) : []),
      [itemMap],
    )

    const expandedSet = useMemo(
      () => new Set(storedExpanded ?? []),
      [storedExpanded],
    )

    const isAllExpanded = useMemo(() => {
      if (allFolderIds.length === 0) return false
      return allFolderIds.every((id) => expandedSet.has(id))
    }, [allFolderIds, expandedSet])

    useEffect(() => {
      onExpandedStateChange?.(isAllExpanded)
    }, [isAllExpanded, onExpandedStateChange])

    const openSearch = useCallback(() => {
      setFileSearchOpen(true)
    }, [setFileSearchOpen])

    const toggleExpandCollapse = useCallback(() => {
      if (expandedSet.size > 0) {
        // Collapse all
        tree.getItems().forEach((item) => {
          if (item.isFolder?.() && item.isExpanded?.()) {
            item.toggleExpanded?.()
          }
        })
        setStoredExpanded([])
      } else {
        // Expand all
        tree.getItems().forEach((item) => {
          if (item.isFolder?.() && !item.isExpanded?.()) {
            item.toggleExpanded?.()
          }
        })
        setStoredExpanded(allFolderIds)
      }
    }, [expandedSet, tree, allFolderIds, setStoredExpanded])

    useImperativeHandle(
      ref,
      () => ({ toggleExpandCollapse, openSearch, isAllExpanded }),
      [toggleExpandCollapse, openSearch, isAllExpanded],
    )

    // ---- Context actions ----

    const toAbsolute = useCallback(
      (relativePath: string) =>
        worktreePath ? worktreePath + "/" + relativePath : relativePath,
      [worktreePath],
    )

    const invalidateFiles = useCallback(() => {
      trpcUtils.files.search.invalidate()
    }, [trpcUtils])

    const handleContextAction = useCallback(
      (
        action: string,
        nodeId: string,
        nodeType: "file" | "folder",
        nodeName: string,
      ) => {
        const absolutePath = toAbsolute(nodeId)

        switch (action) {
          case "open-preview":
            if (!worktreePath) break
            onSelectFile(worktreePath + "/" + nodeId)
            break

          case "mention": {
            const mentionType = nodeType === "folder" ? "folder" : "file"
            window.dispatchEvent(
              new CustomEvent("file-tree-mention", {
                detail: {
                  id: `${mentionType}:local:${absolutePath}`,
                  label: nodeName,
                  path: absolutePath,
                  repository: "local",
                  type: mentionType,
                },
              }),
            )
            break
          }

          case "open-editor":
            openInAppMutation.mutate({ path: absolutePath, app: preferredEditor })
            break

          case "reveal-finder":
            openInFinderMutation.mutate(absolutePath)
            break

          case "copy-path":
            navigator.clipboard.writeText(absolutePath)
            toast.success("Copied to clipboard", { description: absolutePath })
            break

          case "copy-relative":
            navigator.clipboard.writeText(nodeId)
            toast.success("Copied to clipboard", { description: nodeId })
            break

          case "rename":
            setRenameTarget({ id: nodeId, name: nodeName, type: nodeType })
            break

          case "delete": {
            const label = nodeType === "folder" ? "folder" : "file"
            if (window.confirm(`Move "${nodeName}" to trash?`)) {
              deleteMutation.mutate(
                { absolutePath },
                {
                  onSuccess: () => {
                    toast.success(`${nodeName} moved to trash`)
                    invalidateFiles()
                  },
                  onError: (err) => {
                    toast.error(`Failed to delete ${label}`, {
                      description: err.message,
                    })
                  },
                },
              )
            }
            break
          }
        }
      },
      [
        toAbsolute,
        worktreePath,
        onSelectFile,
        openInAppMutation,
        openInFinderMutation,
        preferredEditor,
        deleteMutation,
        invalidateFiles,
      ],
    )

    const handleRenameSave = useCallback(
      async (newName: string) => {
        if (!renameTarget || !worktreePath) return
        const absolutePath = toAbsolute(renameTarget.id)
        setRenameLoading(true)
        try {
          await renameMutation.mutateAsync({ absolutePath, newName })
          toast.success(`Renamed to ${newName}`)
          invalidateFiles()
          setRenameTarget(null)
        } catch (err: any) {
          toast.error("Failed to rename", { description: err.message })
          throw err
        } finally {
          setRenameLoading(false)
        }
      },
      [renameTarget, worktreePath, toAbsolute, renameMutation, invalidateFiles],
    )

    const handleRenameClose = useCallback(() => setRenameTarget(null), [])

    // ---- Render ----

    if (!worktreePath) {
      return (
        <div
          className={cn(
            "flex-1 flex items-center justify-center p-4",
            className,
          )}
        >
          <p className="text-xs text-muted-foreground">No project open</p>
        </div>
      )
    }

    if (!itemMap) {
      return (
        <div className={cn("flex flex-col h-full min-w-0 overflow-hidden", className)}>
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-muted-foreground">Loading files...</p>
          </div>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "flex flex-col h-full min-w-0 overflow-hidden",
          className,
        )}
      >
        <div className="flex-1 overflow-y-auto pb-2">
          <Tree
            className={cn(
              // Vertical guide lines: one line per indent level
              "before:-ms-0 relative before:absolute before:inset-0",
              "before:bg-[repeating-linear-gradient(to_right,transparent_0,transparent_calc(var(--tree-indent)-1px),color-mix(in_oklch,var(--border)_60%,transparent)_calc(var(--tree-indent)-1px),color-mix(in_oklch,var(--border)_60%,transparent)_calc(var(--tree-indent)))]",
            )}
            indent={INDENT}
            tree={tree}
          >
            {tree.getItems().map((item) => {
              const data = item.getItemData()
              const isFolder = item.isFolder()
              const isExpanded = item.isExpanded()
              const nodeId = item.getId()
              const isFocused =
                typeof item.isFocused === "function" ? item.isFocused() : false
              const isActive = !isFocused && activePath === nodeId

              const FileIcon2 = !isFolder
                ? (getFileIconByExtension(data.name) ?? UnknownFileIcon)
                : null

              return (
                <ContextMenu key={item.getId()}>
                  <ContextMenuTrigger asChild>
                    <TreeItem
                      item={item}
                      onClick={() => {
                        if (!isFolder) {
                          onSelectFile(worktreePath + "/" + nodeId)
                        }
                      }}
                      className="w-full text-left"
                    >
                      <TreeItemLabel
                        className={cn(
                          "h-[22px] py-0 rounded-sm text-xs gap-1.5",
                          isFocused
                            ? "bg-accent text-accent-foreground"
                            : isActive
                              ? "bg-accent/50 text-accent-foreground"
                              : "hover:bg-accent/50",
                          // override the not-in-data-[folder] left-padding
                          "not-in-data-[folder=true]:ps-2",
                        )}
                      >
                        {isFolder ? (
                          isExpanded ? (
                            <FolderOpenIcon className="size-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <FolderIcon className="size-3.5 text-muted-foreground shrink-0" />
                          )
                        ) : (
                          FileIcon2 && (
                            <FileIcon2 className="size-3.5 text-muted-foreground shrink-0" />
                          )
                        )}
                        <span className="truncate min-w-0">{data.name}</span>
                      </TreeItemLabel>
                    </TreeItem>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-52">
                    {!isFolder && (
                      <>
                        <ContextMenuItem
                          onClick={() =>
                            handleContextAction(
                              "open-preview",
                              nodeId,
                              data.type,
                              data.name,
                            )
                          }
                        >
                          Open Preview
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                      </>
                    )}
                    <ContextMenuItem
                      onClick={() =>
                        handleContextAction(
                          "mention",
                          nodeId,
                          data.type,
                          data.name,
                        )
                      }
                    >
                      Add to Chat Context
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() =>
                        handleContextAction(
                          "open-editor",
                          nodeId,
                          data.type,
                          data.name,
                        )
                      }
                    >
                      Open in {editorLabel}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        handleContextAction(
                          "reveal-finder",
                          nodeId,
                          data.type,
                          data.name,
                        )
                      }
                    >
                      Reveal in Finder
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() =>
                        handleContextAction(
                          "copy-path",
                          nodeId,
                          data.type,
                          data.name,
                        )
                      }
                    >
                      Copy Path
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        handleContextAction(
                          "copy-relative",
                          nodeId,
                          data.type,
                          data.name,
                        )
                      }
                    >
                      Copy Relative Path
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() =>
                        handleContextAction(
                          "rename",
                          nodeId,
                          data.type,
                          data.name,
                        )
                      }
                    >
                      Rename...
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        handleContextAction(
                          "delete",
                          nodeId,
                          data.type,
                          data.name,
                        )
                      }
                      className="data-[highlighted]:bg-red-500/15 data-[highlighted]:text-red-400"
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </Tree>
        </div>

        <RenameDialog
          isOpen={!!renameTarget}
          onClose={handleRenameClose}
          onSave={handleRenameSave}
          currentName={renameTarget?.name ?? ""}
          isLoading={renameLoading}
          title="Rename"
          placeholder="New name"
        />
      </div>
    )
  }),
)
