import {
    MessageSquare,
    Plus,
    MoreVertical,
    Copy,
    Trash2,
    Eye,
    Edit,
    Globe,
    Users
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { ChatInterface } from "@flowmaestro/shared";
import { CreateChatInterfaceDialog } from "../components/chat/builder/CreateChatInterfaceDialog";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { Dialog } from "../components/common/Dialog";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import { getChatInterfaces, deleteChatInterface, duplicateChatInterface } from "../lib/api";
import { logger } from "../lib/logger";

export function ChatInterfacesPage() {
    const navigate = useNavigate();

    // State
    const [chatInterfaces, setChatInterfaces] = useState<ChatInterface[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<{ title: string; message: string } | null>(null);

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ChatInterface | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
    }>({ isOpen: false, position: { x: 0, y: 0 } });

    // Dropdown menu state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Load chat interfaces on mount
    useEffect(() => {
        loadChatInterfaces();
    }, []);

    // Close menu on outside click
    useEffect(() => {
        if (!openMenuId) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openMenuId]);

    const loadChatInterfaces = async () => {
        try {
            const response = await getChatInterfaces();
            if (response.success && response.data) {
                setChatInterfaces(response.data.items);
            }
        } catch (err) {
            logger.error("Failed to load chat interfaces", err);
            setError({
                title: "Failed to load",
                message: err instanceof Error ? err.message : "Unknown error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            await deleteChatInterface(deleteTarget.id);
            setChatInterfaces((prev) => prev.filter((ci) => ci.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            logger.error("Failed to delete chat interface", err);
            setError({
                title: "Delete failed",
                message: err instanceof Error ? err.message : "Failed to delete"
            });
        }
    };

    const handleDuplicate = async (chatInterface: ChatInterface) => {
        try {
            const response = await duplicateChatInterface(chatInterface.id);
            if (response.success && response.data) {
                setChatInterfaces((prev) => [response.data, ...prev]);
            }
        } catch (err) {
            logger.error("Failed to duplicate chat interface", err);
            setError({
                title: "Duplicate failed",
                message: err instanceof Error ? err.message : "Failed to duplicate"
            });
        }
        setOpenMenuId(null);
    };

    const handleCreated = (newChatInterface: { id: string; title: string }) => {
        // Reload the list to get the full chat interface data
        loadChatInterfaces();
        // Navigate to edit the newly created chat interface
        navigate(`/chat-interfaces/${newChatInterface.id}/edit`);
    };

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, ci: ChatInterface) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(ci.id)) {
                        newSet.delete(ci.id);
                    } else {
                        newSet.add(ci.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/chat-interfaces/${ci.id}/edit`);
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, ci: ChatInterface) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(ci.id)) {
                setSelectedIds(new Set([ci.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY }
            });
        },
        [selectedIds]
    );

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            // Delete all selected chat interfaces
            const deletePromises = Array.from(selectedIds).map((id) => deleteChatInterface(id));
            await Promise.all(deletePromises);

            // Refresh the list and clear selection
            await loadChatInterfaces();
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
        } catch (err) {
            logger.error("Failed to delete chat interfaces", err);
            setError({
                title: "Delete Failed",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to delete some chat interfaces. Please try again."
            });
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
    }, []);

    const contextMenuItems: ContextMenuItem[] = [
        {
            label: `Delete ${selectedIds.size} chat${selectedIds.size !== 1 ? "s" : ""}`,
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handleBatchDelete,
            variant: "danger",
            disabled: isBatchDeleting
        }
    ];

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-8">
                <LoadingState message="Loading chat interfaces..." />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Chat Interfaces"
                description={
                    selectedIds.size > 0
                        ? `${selectedIds.size} selected`
                        : "Create embeddable chat interfaces that connect to your agents"
                }
                action={
                    selectedIds.size > 0 ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                                Clear selection
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBatchDelete}
                                disabled={isBatchDeleting}
                                loading={isBatchDeleting}
                            >
                                {!isBatchDeleting && <Trash2 className="w-4 h-4" />}
                                Delete selected
                            </Button>
                        </div>
                    ) : (
                        <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Chat Interface
                        </Button>
                    )
                }
            />

            {chatInterfaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No chat interfaces yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Create a chat interface to embed your agents on websites as chat widgets or
                        full-page chat experiences.
                    </p>
                    <Button variant="primary" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Chat Interface
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    {chatInterfaces.map((ci) => (
                        <div
                            key={ci.id}
                            className={`bg-card border rounded-lg transition-colors cursor-pointer select-none ${
                                selectedIds.has(ci.id)
                                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            }`}
                            onClick={(e) => handleCardClick(e, ci)}
                            onContextMenu={(e) => handleContextMenu(e, ci)}
                        >
                            {/* Cover with icon */}
                            <div className="relative">
                                <div
                                    className="h-32 w-full overflow-hidden rounded-t-lg"
                                    style={{
                                        backgroundColor:
                                            ci.coverType === "color" ? ci.coverValue : "#6366f1",
                                        backgroundImage:
                                            ci.coverType === "image"
                                                ? `url(${ci.coverValue})`
                                                : ci.coverType === "gradient"
                                                  ? ci.coverValue
                                                  : undefined,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center"
                                    }}
                                />
                                {/* Icon overlay - positioned outside cover to avoid clip */}
                                {ci.iconUrl && (
                                    <div className="absolute -bottom-6 left-4">
                                        <div className="w-12 h-12 rounded-lg bg-card border-2 border-background overflow-hidden flex items-center justify-center text-2xl">
                                            {ci.iconUrl.startsWith("http") ? (
                                                <img
                                                    src={ci.iconUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                ci.iconUrl
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className={`p-4 ${ci.iconUrl ? "pt-8" : ""}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-foreground truncate">
                                            {ci.title}
                                        </h3>
                                        {ci.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {ci.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Menu */}
                                    <div
                                        className="relative"
                                        ref={openMenuId === ci.id ? menuRef : null}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() =>
                                                setOpenMenuId(openMenuId === ci.id ? null : ci.id)
                                            }
                                            className="p-1.5 hover:bg-muted rounded-md text-muted-foreground"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {openMenuId === ci.id && (
                                            <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                                <button
                                                    onClick={() => {
                                                        navigate(`/chat-interfaces/${ci.id}/edit`);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                {ci.status === "published" && (
                                                    <button
                                                        onClick={() => {
                                                            window.open(`/c/${ci.slug}`, "_blank");
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View Live
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        navigate(
                                                            `/chat-interfaces/${ci.id}/sessions`
                                                        );
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <Users className="w-4 h-4" />
                                                    Sessions ({ci.sessionCount})
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicate(ci)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    Duplicate
                                                </button>
                                                <hr className="my-1 border-border" />
                                                <button
                                                    onClick={() => {
                                                        setDeleteTarget(ci);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status & Stats */}
                                <div className="flex items-center gap-2 mt-3">
                                    <Badge
                                        variant={ci.status === "published" ? "success" : "default"}
                                    >
                                        {ci.status === "published" ? (
                                            <>
                                                <Globe className="w-3 h-3 mr-1" />
                                                Published
                                            </>
                                        ) : (
                                            "Draft"
                                        )}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {ci.sessionCount} sessions
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {ci.messageCount} messages
                                    </span>
                                </div>

                                <p className="text-xs text-muted-foreground mt-2">
                                    Updated {formatDate(ci.updatedAt)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <CreateChatInterfaceDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onCreated={handleCreated}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Chat Interface"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone and all sessions will be lost.`}
                confirmText="Delete"
                variant="danger"
            />

            {/* Error Dialog */}
            {error && (
                <Dialog isOpen={error !== null} onClose={() => setError(null)} title={error.title}>
                    <p className="text-muted-foreground">{error.message}</p>
                    <div className="flex justify-end mt-4">
                        <Button variant="primary" onClick={() => setError(null)}>
                            OK
                        </Button>
                    </div>
                </Dialog>
            )}

            {/* Context Menu for batch operations */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={contextMenuItems}
                onClose={closeContextMenu}
            />
        </div>
    );
}
