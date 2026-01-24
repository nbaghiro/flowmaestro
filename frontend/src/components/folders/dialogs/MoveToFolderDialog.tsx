import { Folder, Plus, ChevronRight, Home } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { FolderWithCounts, FolderResourceType, FolderTreeNode } from "@flowmaestro/shared";
import { cn } from "../../../lib/utils";
import { Alert } from "../../common/Alert";
import { Button } from "../../common/Button";
import { Dialog } from "../../common/Dialog";
import { LoadingState } from "../../common/Spinner";

interface MoveToFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    folders: FolderWithCounts[];
    folderTree?: FolderTreeNode[];
    isLoadingFolders: boolean;
    selectedItemCount: number;
    itemType: FolderResourceType;
    currentFolderId: string | null;
    onMove: (folderId: string | null) => Promise<void>;
    onCreateFolder: () => void;
    /** When moving a folder, pass its ID to disable it and its descendants */
    movingFolderId?: string;
    /** When true, show total item counts instead of type-specific counts */
    showTotalCounts?: boolean;
}

export function MoveToFolderDialog({
    isOpen,
    onClose,
    folders,
    folderTree,
    isLoadingFolders,
    selectedItemCount,
    itemType,
    currentFolderId,
    onMove,
    onCreateFolder,
    movingFolderId,
    showTotalCounts = false
}: MoveToFolderDialogProps) {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [error, setError] = useState("");
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // Determine if we're moving a folder (vs moving items)
    const isMovingFolder = !!movingFolderId;

    // Get all descendant IDs of the folder being moved (to disable them as targets)
    const disabledFolderIds = useMemo(() => {
        if (!movingFolderId || !folderTree) return new Set<string>();

        const disabled = new Set<string>([movingFolderId]);

        // Need multiple passes to catch all descendants
        const flattenTree = (nodes: FolderTreeNode[]): FolderTreeNode[] => {
            const result: FolderTreeNode[] = [];
            for (const node of nodes) {
                result.push(node);
                if (node.children.length > 0) {
                    result.push(...flattenTree(node.children));
                }
            }
            return result;
        };

        const allFolders = flattenTree(folderTree);
        // Run multiple passes until no more are added
        let prevSize = 0;
        while (disabled.size !== prevSize) {
            prevSize = disabled.size;
            for (const folder of allFolders) {
                if (folder.parentId && disabled.has(folder.parentId)) {
                    disabled.add(folder.id);
                }
            }
        }

        return disabled;
    }, [movingFolderId, folderTree]);

    // Reset selection when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedFolderId(null);
            setError("");
            // Expand all folders by default for easier navigation
            if (folderTree) {
                const allIds = new Set<string>();
                const collectIds = (nodes: FolderTreeNode[]) => {
                    for (const node of nodes) {
                        allIds.add(node.id);
                        if (node.children.length > 0) {
                            collectIds(node.children);
                        }
                    }
                };
                collectIds(folderTree);
                setExpandedFolders(allIds);
            }
        }
    }, [isOpen, folderTree]);

    const toggleExpanded = useCallback((folderId: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    const handleMove = async () => {
        setError("");
        setIsMoving(true);
        try {
            await onMove(selectedFolderId);
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to move items");
        } finally {
            setIsMoving(false);
        }
    };

    const handleClose = () => {
        if (!isMoving) {
            setSelectedFolderId(null);
            setError("");
            onClose();
        }
    };

    // Get display name for item type
    const getItemTypeDisplay = () => {
        switch (itemType) {
            case "workflow":
                return selectedItemCount === 1 ? "workflow" : "workflows";
            case "agent":
                return selectedItemCount === 1 ? "agent" : "agents";
            case "form-interface":
                return selectedItemCount === 1 ? "form interface" : "form interfaces";
            case "chat-interface":
                return selectedItemCount === 1 ? "chat interface" : "chat interfaces";
            case "knowledge-base":
                return selectedItemCount === 1 ? "knowledge base" : "knowledge bases";
            default:
                return selectedItemCount === 1 ? "item" : "items";
        }
    };

    // Get count for the current item type in a folder
    const getItemTypeCount = (folder: FolderWithCounts): number => {
        if (showTotalCounts) {
            return folder.itemCounts.total;
        }
        switch (itemType) {
            case "workflow":
                return folder.itemCounts.workflows;
            case "agent":
                return folder.itemCounts.agents;
            case "form-interface":
                return folder.itemCounts.formInterfaces;
            case "chat-interface":
                return folder.itemCounts.chatInterfaces;
            case "knowledge-base":
                return folder.itemCounts.knowledgeBases;
            default:
                return folder.itemCounts.total;
        }
    };

    // Get display label for item type count
    const getItemTypeCountLabel = (count: number): string => {
        if (count === 0) return "Empty";
        if (showTotalCounts) {
            return `${count} ${count === 1 ? "item" : "items"}`;
        }
        const typeLabel = getItemTypeDisplay();
        return `${count} ${typeLabel}`;
    };

    // Filter out the current folder from options
    const availableFolders = folders.filter((f) => f.id !== currentFolderId);

    // Render a single folder item in the tree
    const renderFolderItem = (folder: FolderTreeNode | FolderWithCounts, depth: number = 0) => {
        const isDisabled = disabledFolderIds.has(folder.id) || folder.id === currentFolderId;
        const isSelected = selectedFolderId === folder.id;
        const hasChildren = "children" in folder && folder.children.length > 0;
        const isExpanded = expandedFolders.has(folder.id);

        return (
            <div key={folder.id}>
                <button
                    type="button"
                    onClick={() => !isDisabled && setSelectedFolderId(folder.id)}
                    className={cn(
                        "w-full flex items-center gap-2 py-2 px-3 rounded-lg transition-colors text-left",
                        isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted/50",
                        isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    disabled={isMoving || isDisabled}
                >
                    {/* Expand/collapse chevron */}
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(folder.id);
                            }}
                            className="p-0.5 -ml-1 hover:bg-muted rounded transition-colors"
                        >
                            <ChevronRight
                                className={cn(
                                    "w-3.5 h-3.5 transition-transform",
                                    isExpanded && "rotate-90"
                                )}
                            />
                        </button>
                    ) : (
                        <div className="w-3.5 h-3.5 -ml-1" />
                    )}

                    {/* Folder color bar */}
                    <div
                        className="w-0.5 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color }}
                    />

                    {/* Folder info */}
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate text-sm">
                            {folder.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isMovingFolder
                                ? `${folder.itemCounts.total} items`
                                : getItemTypeCountLabel(getItemTypeCount(folder))}
                        </p>
                    </div>
                </button>

                {/* Render children if expanded */}
                {hasChildren && isExpanded && (
                    <div>
                        {(folder as FolderTreeNode).children.map((child) =>
                            renderFolderItem(child, depth + 1)
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Get dialog title and description
    const dialogTitle = isMovingFolder ? "Move Folder" : "Move to Folder";
    const dialogDescription = isMovingFolder
        ? "Select a new parent folder"
        : showTotalCounts
          ? `Select a destination for ${selectedItemCount} ${selectedItemCount === 1 ? "item" : "items"}`
          : `Select a destination for ${selectedItemCount} ${getItemTypeDisplay()}`;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title={dialogTitle}
            description={dialogDescription}
            size="sm"
            closeOnBackdropClick={!isMoving}
        >
            <div className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {isLoadingFolders ? (
                    <LoadingState message="Loading folders..." />
                ) : (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                        {/* Move to Root option (for folder moves only) */}
                        {isMovingFolder && (
                            <button
                                type="button"
                                onClick={() => setSelectedFolderId(null)}
                                className={cn(
                                    "w-full flex items-center gap-2 py-2 px-3 rounded-lg transition-colors text-left",
                                    selectedFolderId === null
                                        ? "bg-primary/10 border border-primary"
                                        : "hover:bg-muted/50"
                                )}
                                disabled={isMoving}
                            >
                                <div className="w-3.5 h-3.5 -ml-1" />
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                    <Home className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate text-sm">
                                        Root Level
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Move to top level (no parent)
                                    </p>
                                </div>
                            </button>
                        )}

                        {/* Folder tree or flat list */}
                        {folderTree && folderTree.length > 0 ? (
                            folderTree.map((folder) => renderFolderItem(folder, 0))
                        ) : availableFolders.length > 0 ? (
                            availableFolders.map((folder) => renderFolderItem(folder, 0))
                        ) : !currentFolderId && !isMovingFolder ? (
                            <div className="text-center py-6">
                                <Folder className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground mb-3">No folders yet</p>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={onCreateFolder}
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Folder
                                </Button>
                            </div>
                        ) : null}

                        {/* Create new folder button */}
                        {!isMovingFolder && (availableFolders.length > 0 || currentFolderId) && (
                            <button
                                type="button"
                                onClick={onCreateFolder}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left"
                                disabled={isMoving}
                            >
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">Create new folder</p>
                            </button>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Button type="button" variant="ghost" onClick={handleClose} disabled={isMoving}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleMove}
                        disabled={
                            isMoving ||
                            isLoadingFolders ||
                            // For folder moves, null is valid (move to root)
                            // For item moves, must select a folder
                            (!isMovingFolder && selectedFolderId === null)
                        }
                        loading={isMoving}
                    >
                        {isMoving ? "Moving..." : "Move"}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
