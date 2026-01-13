/**
 * FolderGridSection Component
 *
 * Shared component for rendering the folder grid section on item list pages.
 * Eliminates duplication of folder grid JSX across Workflows, Agents, etc.
 */

import type { Folder, FolderWithCounts, FolderResourceType } from "@flowmaestro/shared";
import { FolderCard } from "./FolderCard";

export interface FolderGridSectionProps {
    /** Whether to show the folders section */
    showFoldersSection: boolean;
    /** Whether the section can be shown (has folders to display) */
    canShowFoldersSection: boolean;
    /** Root level folders to display */
    rootFolders: FolderWithCounts[];
    /** Set of expanded folder IDs */
    expandedFolderIds: Set<string>;
    /** Set of selected folder IDs */
    selectedFolderIds: Set<string>;
    /** The item type for display (workflow, agent, etc.) */
    displayItemType: FolderResourceType;
    /** Label for the items section below folders (e.g., "Workflows", "Agents") */
    itemsLabel: string;
    /** Handler for folder click */
    onFolderClick: (e: React.MouseEvent, folder: FolderWithCounts) => void;
    /** Handler for folder edit */
    onFolderEdit: (folder: Folder) => void;
    /** Handler for folder delete */
    onFolderDelete: (folder: FolderWithCounts) => void;
    /** Handler for folder context menu */
    onFolderContextMenu: (e: React.MouseEvent, folder: FolderWithCounts) => void;
    /** Handler for drop on folder */
    onDropOnFolder: (folderId: string, itemIds: string[], itemType: string) => void;
    /** Handler for toggling folder expansion */
    onToggleFolderExpand: (folderId: string) => void;
    /** Function to get children of a folder */
    getFolderChildren: (folderId: string) => FolderWithCounts[];
    /** Optional function to calculate count including subfolders */
    getFolderCountIncludingSubfolders?: (
        folder: FolderWithCounts,
        itemType: FolderResourceType
    ) => number;
}

export function FolderGridSection({
    showFoldersSection,
    canShowFoldersSection,
    rootFolders,
    expandedFolderIds,
    selectedFolderIds,
    displayItemType,
    itemsLabel,
    onFolderClick,
    onFolderEdit,
    onFolderDelete,
    onFolderContextMenu,
    onDropOnFolder,
    onToggleFolderExpand,
    getFolderChildren,
    getFolderCountIncludingSubfolders
}: FolderGridSectionProps) {
    if (!showFoldersSection || !canShowFoldersSection) {
        return null;
    }

    return (
        <>
            <div className="mb-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Folders
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {rootFolders.map((folder) => {
                    const children = getFolderChildren(folder.id);
                    const hasChildren = children.length > 0;
                    const isExpanded = expandedFolderIds.has(folder.id);
                    const subfolders = isExpanded ? children : [];
                    const calculatedCount = getFolderCountIncludingSubfolders
                        ? getFolderCountIncludingSubfolders(folder, displayItemType)
                        : undefined;

                    return (
                        <div key={folder.id} className="contents">
                            <div>
                                <FolderCard
                                    folder={folder}
                                    onClick={(e) => onFolderClick(e, folder)}
                                    onEdit={() => onFolderEdit(folder)}
                                    onDelete={() => onFolderDelete(folder)}
                                    isSelected={selectedFolderIds.has(folder.id)}
                                    onContextMenu={(e) => onFolderContextMenu(e, folder)}
                                    onDrop={(itemIds, itemType) =>
                                        onDropOnFolder(folder.id, itemIds, itemType)
                                    }
                                    displayItemType={displayItemType}
                                    calculatedCount={calculatedCount}
                                    hasChildren={hasChildren}
                                    isExpanded={isExpanded}
                                    onToggleExpand={(e) => {
                                        e.stopPropagation();
                                        onToggleFolderExpand(folder.id);
                                    }}
                                />
                                {/* Render subfolders when expanded - below parent */}
                                {isExpanded && subfolders.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-2">
                                        {subfolders.map((subfolder) => {
                                            const subfolderCalculatedCount =
                                                getFolderCountIncludingSubfolders
                                                    ? getFolderCountIncludingSubfolders(
                                                          subfolder,
                                                          displayItemType
                                                      )
                                                    : undefined;
                                            return (
                                                <FolderCard
                                                    key={subfolder.id}
                                                    folder={subfolder}
                                                    onClick={(e) => onFolderClick(e, subfolder)}
                                                    onEdit={() => onFolderEdit(subfolder)}
                                                    onDelete={() => onFolderDelete(subfolder)}
                                                    isSelected={selectedFolderIds.has(subfolder.id)}
                                                    onContextMenu={(e) =>
                                                        onFolderContextMenu(e, subfolder)
                                                    }
                                                    onDrop={(itemIds, itemType) =>
                                                        onDropOnFolder(
                                                            subfolder.id,
                                                            itemIds,
                                                            itemType
                                                        )
                                                    }
                                                    displayItemType={displayItemType}
                                                    calculatedCount={subfolderCalculatedCount}
                                                    isSubfolder={true}
                                                    hasChildren={
                                                        getFolderChildren(subfolder.id).length > 0
                                                    }
                                                    isExpanded={expandedFolderIds.has(subfolder.id)}
                                                    onToggleExpand={(e) => {
                                                        e.stopPropagation();
                                                        onToggleFolderExpand(subfolder.id);
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="border-t border-border my-6" />
            <div className="mb-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {itemsLabel}
                </h2>
            </div>
        </>
    );
}
