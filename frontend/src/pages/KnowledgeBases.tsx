import {
    BookOpen,
    Plus,
    Trash2,
    MoreVertical,
    Calendar,
    Edit2,
    FileText,
    Layers,
    HardDrive
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import { CreateKnowledgeBaseModal } from "../components/knowledgebases";
import { getKnowledgeBaseStats, type KnowledgeBaseStats, type KnowledgeBase } from "../lib/api";
import { logger } from "../lib/logger";
import { useKnowledgeBaseStore } from "../stores/knowledgeBaseStore";

function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function KnowledgeBases() {
    const navigate = useNavigate();
    const { knowledgeBases, loading, error, fetchKnowledgeBases, createKB, deleteKB } =
        useKnowledgeBaseStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [kbToDelete, setKbToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [kbStats, setKbStats] = useState<Record<string, KnowledgeBaseStats>>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
    }>({ isOpen: false, position: { x: 0, y: 0 } });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]);

    // Fetch stats for all knowledge bases
    useEffect(() => {
        const fetchAllStats = async () => {
            const statsPromises = knowledgeBases.map(async (kb) => {
                try {
                    const response = await getKnowledgeBaseStats(kb.id);
                    if (response.success && response.data) {
                        return { id: kb.id, stats: response.data };
                    }
                } catch (err) {
                    logger.error("Failed to fetch stats for KB", err, { kbId: kb.id });
                }
                return null;
            });

            const results = await Promise.all(statsPromises);
            const newStats: Record<string, KnowledgeBaseStats> = {};
            results.forEach((result) => {
                if (result) {
                    newStats[result.id] = result.stats;
                }
            });
            setKbStats(newStats);
        };

        if (knowledgeBases.length > 0) {
            fetchAllStats();
        }
    }, [knowledgeBases]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [openMenuId]);

    const handleCreate = async (name: string, description?: string) => {
        try {
            const kb = await createKB({
                name,
                description
            });
            setShowCreateModal(false);
            navigate(`/knowledge-bases/${kb.id}`);
        } catch (error) {
            logger.error("Failed to create knowledge base", error);
        }
    };

    const handleDelete = async () => {
        if (!kbToDelete) return;

        setIsDeleting(true);
        try {
            await deleteKB(kbToDelete.id);
            await fetchKnowledgeBases();
            setKbToDelete(null);
        } catch (error) {
            logger.error("Failed to delete knowledge base", error);
        } finally {
            setIsDeleting(false);
        }
    };

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, kb: KnowledgeBase) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(kb.id)) {
                        newSet.delete(kb.id);
                    } else {
                        newSet.add(kb.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/knowledge-bases/${kb.id}`);
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, kb: KnowledgeBase) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(kb.id)) {
                setSelectedIds(new Set([kb.id]));
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
            // Delete all selected knowledge bases
            const deletePromises = Array.from(selectedIds).map((id) => deleteKB(id));
            await Promise.all(deletePromises);

            // Refresh the list and clear selection
            await fetchKnowledgeBases();
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
        } catch (error) {
            logger.error("Failed to delete knowledge bases", error);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
    }, []);

    const contextMenuItems: ContextMenuItem[] = [
        {
            label: `Delete ${selectedIds.size} knowledge base${selectedIds.size !== 1 ? "s" : ""}`,
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handleBatchDelete,
            variant: "danger",
            disabled: isBatchDeleting
        }
    ];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Knowledge Bases"
                description={
                    selectedIds.size > 0
                        ? `${selectedIds.size} selected`
                        : "Manage your document collections for RAG workflows"
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
                        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                            <Plus className="w-4 h-4" />
                            New Knowledge Base
                        </Button>
                    )
                }
            />

            {/* Error Message */}
            {error && (
                <div className="mb-4">
                    <Alert variant="error">{error}</Alert>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <LoadingState message="Loading knowledge bases..." />
            ) : knowledgeBases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No knowledge bases yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Create your first knowledge base to start uploading documents for RAG
                        workflows.
                    </p>
                    <Button variant="primary" onClick={() => setShowCreateModal(true)} size="lg">
                        <Plus className="w-4 h-4" />
                        Create Your First Knowledge Base
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {knowledgeBases.map((kb) => {
                        const stats = kbStats[kb.id];
                        return (
                            <div
                                key={kb.id}
                                className={`bg-card border rounded-lg p-5 hover:shadow-md transition-all group relative flex flex-col h-full cursor-pointer select-none ${
                                    selectedIds.has(kb.id)
                                        ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                                        : "border-border hover:border-primary"
                                }`}
                                onClick={(e) => handleCardClick(e, kb)}
                                onContextMenu={(e) => handleContextMenu(e, kb)}
                            >
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                        <div className="flex items-center gap-1">
                                            <Badge variant="default" size="sm">
                                                Documents
                                            </Badge>
                                            <Badge variant="default" size="sm">
                                                {kb.config.embeddingModel}
                                            </Badge>

                                            {/* Menu Button */}
                                            <div
                                                className="relative"
                                                ref={openMenuId === kb.id ? menuRef : null}
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(
                                                            openMenuId === kb.id ? null : kb.id
                                                        );
                                                    }}
                                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                                    title="More options"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {openMenuId === kb.id && (
                                                    <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                navigate(
                                                                    `/knowledge-bases/${kb.id}`
                                                                );
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                setKbToDelete({
                                                                    id: kb.id,
                                                                    name: kb.name
                                                                });
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                        {kb.name}
                                    </h3>

                                    {kb.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {kb.description}
                                        </p>
                                    )}

                                    {/* Spacer to push stats and date to bottom */}
                                    <div className="flex-1 min-h-4" />

                                    {/* Stats */}
                                    {stats && (
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                            <div className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                <span>{stats.document_count} docs</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Layers className="w-3 h-3" />
                                                <span>{stats.chunk_count} chunks</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <HardDrive className="w-3 h-3" />
                                                <span>
                                                    {formatFileSize(stats.total_size_bytes)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>Created {formatDate(kb.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <CreateKnowledgeBaseModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreate}
            />

            {/* Delete Confirmation Dialog */}
            {kbToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Delete Knowledge Base
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete "{kbToDelete.name}"? This action cannot
                            be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setKbToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                loading={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
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
