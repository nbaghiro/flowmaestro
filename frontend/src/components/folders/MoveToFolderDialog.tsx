import { Folder, FolderOpen, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import type { FolderWithCounts, FolderResourceType } from "@flowmaestro/shared";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { LoadingState } from "../common/Spinner";

interface MoveToFolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    folders: FolderWithCounts[];
    isLoadingFolders: boolean;
    selectedItemCount: number;
    itemType: FolderResourceType;
    currentFolderId: string | null;
    onMove: (folderId: string | null) => Promise<void>;
    onCreateFolder: () => void;
}

export function MoveToFolderDialog({
    isOpen,
    onClose,
    folders,
    isLoadingFolders,
    selectedItemCount,
    itemType,
    currentFolderId,
    onMove,
    onCreateFolder
}: MoveToFolderDialogProps) {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [error, setError] = useState("");

    // Reset selection when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedFolderId(null);
            setError("");
        }
    }, [isOpen]);

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
        const typeLabel = getItemTypeDisplay();
        return `${count} ${typeLabel}`;
    };

    // Filter out the current folder from options
    const availableFolders = folders.filter((f) => f.id !== currentFolderId);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Move to Folder"
            description={`Select a destination for ${selectedItemCount} ${getItemTypeDisplay()}`}
            size="sm"
            closeOnBackdropClick={!isMoving}
        >
            <div className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {isLoadingFolders ? (
                    <LoadingState message="Loading folders..." />
                ) : (
                    <div className="space-y-2">
                        {/* Folder options */}
                        {availableFolders.length > 0 ? (
                            availableFolders.map((folder) => (
                                <button
                                    key={folder.id}
                                    type="button"
                                    onClick={() => setSelectedFolderId(folder.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                                        selectedFolderId === folder.id
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                                    }`}
                                    disabled={isMoving}
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${folder.color}20` }}
                                    >
                                        {selectedFolderId === folder.id ? (
                                            <FolderOpen
                                                className="w-5 h-5"
                                                style={{ color: folder.color }}
                                            />
                                        ) : (
                                            <Folder
                                                className="w-5 h-5"
                                                style={{ color: folder.color }}
                                                fill={folder.color}
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                            {folder.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {getItemTypeCountLabel(getItemTypeCount(folder))}
                                        </p>
                                    </div>
                                </button>
                            ))
                        ) : !currentFolderId ? (
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
                        {(availableFolders.length > 0 || currentFolderId) && (
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
                        disabled={isMoving || isLoadingFolders || selectedFolderId === null}
                        loading={isMoving}
                    >
                        {isMoving ? "Moving..." : "Move"}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
