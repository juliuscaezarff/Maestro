// biome-ignore-all lint/suspicious/noExplicitAny: known

import type { ItemInstance } from "@headless-tree/core"
import { ChevronDownIcon } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"
import * as React from "react"

import { cn } from "@/lib/utils"

interface TreeContextValue<T = any> {
  indent: number
  currentItem?: ItemInstance<T>
  tree?: any
}

const TreeContext = React.createContext<TreeContextValue>({
  currentItem: undefined,
  indent: 20,
  tree: undefined,
})

function useTreeContext<T = any>() {
  return React.useContext(TreeContext) as TreeContextValue<T>
}

interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {
  indent?: number
  tree?: any
}

function Tree({ indent = 20, tree, className, style, ...props }: TreeProps) {
  const containerProps =
    tree && typeof tree.getContainerProps === "function"
      ? tree.getContainerProps()
      : {}

  const { style: containerStyle, ...otherContainerProps } = containerProps

  return (
    <TreeContext.Provider value={{ indent, tree }}>
      <div
        className={cn("flex flex-col", className)}
        data-slot="tree"
        style={{
          ...style,
          ...containerStyle,
        } as React.CSSProperties}
        {...props}
        {...otherContainerProps}
      />
    </TreeContext.Provider>
  )
}

interface TreeItemProps<T = any>
  extends React.HTMLAttributes<HTMLButtonElement> {
  item: ItemInstance<T>
  asChild?: boolean
}

function TreeItem<T = any>({
  item,
  className,
  asChild,
  children,
  onClick,
  style,
  ...props
}: Omit<TreeItemProps<T>, "indent">) {
  const { indent } = useTreeContext<T>()

  const itemProps = typeof item.getProps === "function" ? item.getProps() : {}

  // Run both onClick handlers: headless-tree (selection/expand) + caller
  const mergedOnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    itemProps.onClick?.(e)
    onClick?.(e as any)
  }

  const { style: itemStyle, onClick: _itemClick, ...otherItemProps } = itemProps

  const level = item.getItemMeta().level
  const paddingLeft = level * indent

  const Comp = asChild ? Slot : ("button" as any)

  return (
    <TreeContext.Provider value={{ currentItem: item, indent }}>
      <Comp
        aria-expanded={item.isExpanded()}
        className={cn(
          "flex w-full select-none outline-hidden",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className,
        )}
        data-drag-target={
          typeof item.isDragTarget === "function"
            ? item.isDragTarget() || false
            : undefined
        }
        data-focus={
          typeof item.isFocused === "function"
            ? item.isFocused() || false
            : undefined
        }
        data-folder={
          typeof item.isFolder === "function"
            ? item.isFolder() || false
            : undefined
        }
        data-search-match={
          typeof item.isMatchingSearch === "function"
            ? item.isMatchingSearch() || false
            : undefined
        }
        data-selected={
          typeof item.isSelected === "function"
            ? item.isSelected() || false
            : undefined
        }
        data-slot="tree-item"
        style={{ paddingLeft, ...itemStyle, ...style }}
        onClick={mergedOnClick}
        {...otherItemProps}
        {...props}
      >
        {children}
      </Comp>
    </TreeContext.Provider>
  )
}

interface TreeItemLabelProps<T = any>
  extends React.HTMLAttributes<HTMLSpanElement> {
  item?: ItemInstance<T>
}

function TreeItemLabel<T = any>({
  item: propItem,
  children,
  className,
  ...props
}: TreeItemLabelProps<T>) {
  const { currentItem } = useTreeContext<T>()
  const item = propItem || currentItem

  if (!item) {
    return null
  }

  return (
    <span
      className={cn(
        "flex w-full items-center gap-1 rounded-sm px-2 py-1 text-sm",
        "transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "hover:bg-accent/50",
        "in-data-[selected=true]:bg-accent in-data-[selected=true]:text-accent-foreground",
        "in-data-[drag-target=true]:bg-accent",
        "in-data-[search-match=true]:bg-blue-400/20",
        className,
      )}
      data-slot="tree-item-label"
      {...props}
    >
      {item.isFolder() && (
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            !item.isExpanded() && "-rotate-90",
          )}
        />
      )}
      {children ??
        (typeof item.getItemName === "function" ? item.getItemName() : null)}
    </span>
  )
}

function TreeDragLine({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { tree } = useTreeContext()

  if (!tree || typeof tree.getDragLineStyle !== "function") {
    return null
  }

  const dragLine = tree.getDragLineStyle()
  return (
    <div
      className={cn(
        "-mt-px before:-top-[3px] absolute z-30 h-0.5 w-[unset] bg-primary before:absolute before:left-0 before:size-2 before:rounded-full before:border-2 before:border-primary before:bg-background",
        className,
      )}
      style={dragLine}
      {...props}
    />
  )
}

export { Tree, TreeItem, TreeItemLabel, TreeDragLine }
