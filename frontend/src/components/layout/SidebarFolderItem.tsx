import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { FolderTreeNode, FolderWithCounts, FolderResourceType } from "@flowmaestro/shared";
import { FolderEvents } from "../../lib/analytics";
import { cn } from "../../lib/utils";
import { Tooltip } from "../common/Tooltip";

interface SidebarFolderItemProps {
    folder: FolderTreeNode;
    isCollapsed: boolean;
    depth?: number;
    isExpanded?: boolean;
    onContextMenu: (e: React.MouseEvent, folder: FolderWithCounts) => void;
    onDrop?: (folderId: string, itemIds: string[], itemType: FolderResourceType) => void;
    onToggleExpand?: (folderId: string) => void;
    renderChildren?: (children: FolderTreeNode[], depth: number) => React.ReactNode;
}

export function SidebarFolderItem({
    folder,
    isCollapsed,
    depth = 0,
    isExpanded = false,
    onContextMenu,
    onDrop,
    onToggleExpand,
    renderChildren
}: SidebarFolderItemProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDragOver, setIsDragOver] = useState(false);

    const isActive = location.pathname === `/folders/${folder.id}`;
    const hasChildren = folder.children && folder.children.length > 0;

    const handleClick = () => {
        FolderEvents.opened({ folderId: folder.id });
        navigate(`/folders/${folder.id}`);
    };

    const handleChevronClick = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (onToggleExpand) {
            onToggleExpand(folder.id);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu(e, folder);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDragOver) {
            setIsDragOver(true);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Only set to false if we're leaving the container element itself
        const relatedTarget = e.relatedTarget as Node | null;
        if (!e.currentTarget.contains(relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data.itemIds && data.itemType && onDrop) {
                // Track items moved to folder
                FolderEvents.itemMovedToFolder({
                    folderId: folder.id,
                    itemCount: data.itemIds.length,
                    resourceType: data.itemType
                });
                onDrop(folder.id, data.itemIds, data.itemType as FolderResourceType);
            }
        } catch {
            // Invalid drop data, ignore
        }
    };

    // Format item count display
    const getItemCountDisplay = () => {
        const { total } = folder.itemCounts;
        if (total === 0) return "Empty";
        return total.toString();
    };

    // Calculate left padding based on depth (for tree indentation)
    const paddingLeft = isCollapsed ? undefined : `${20 + depth * 16}px`;

    const content = (
        <div className="rounded-lg">
            <button
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                draggable={false}
                className={cn(
                    "w-full flex items-center gap-2 py-2 pr-3 rounded-lg text-sm transition-all relative group",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    isDragOver && "bg-primary/20 border-2 border-dashed border-primary text-primary"
                )}
                style={{ paddingLeft }}
            >
                {/* Active indicator */}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}

                {/* Folder color bar */}
                <div
                    className={cn("w-0.5 h-4 rounded-full flex-shrink-0", isCollapsed && "mx-auto")}
                    style={{ backgroundColor: folder.color }}
                />

                {!isCollapsed && (
                    <>
                        <span className="flex-1 text-left truncate">{folder.name}</span>
                        <span className="text-xs text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                            {getItemCountDisplay()}
                        </span>
                        {/* Expand/Collapse chevron for folders with children */}
                        {hasChildren && (
                            <div
                                onClick={handleChevronClick}
                                className="p-0.5 hover:bg-muted rounded transition-colors cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        handleChevronClick(e);
                                    }
                                }}
                            >
                                <ChevronRight
                                    className={cn(
                                        "w-3.5 h-3.5 transition-transform",
                                        isExpanded && "rotate-90"
                                    )}
                                />
                            </div>
                        )}
                    </>
                )}
            </button>

            {/* Render children if expanded */}
            {!isCollapsed && hasChildren && isExpanded && renderChildren && (
                <div className="mt-0.5">{renderChildren(folder.children, depth + 1)}</div>
            )}
        </div>
    );

    if (isCollapsed) {
        return (
            <Tooltip
                content={`${folder.name} (${folder.itemCounts.total} items)`}
                delay={200}
                position="right"
            >
                {content}
            </Tooltip>
        );
    }

    return content;
}
