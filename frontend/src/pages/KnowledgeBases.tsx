import { BookOpen, Plus, Trash2, MoreVertical, Calendar, Edit2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import { CreateKnowledgeBaseModal } from "../components/knowledgebases";
import { useKnowledgeBaseStore } from "../stores/knowledgeBaseStore";

export function KnowledgeBases() {
    const navigate = useNavigate();
    const { knowledgeBases, loading, error, fetchKnowledgeBases, createKB, deleteKB } =
        useKnowledgeBaseStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [kbToDelete, setKbToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]);

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
            console.error("Failed to create knowledge base:", error);
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
            console.error("Failed to delete knowledge base:", error);
        } finally {
            setIsDeleting(false);
        }
    };

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
                description="Manage your document collections for RAG workflows"
                action={
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4" />
                        New Knowledge Base
                    </Button>
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
                    {knowledgeBases.map((kb) => (
                        <div
                            key={kb.id}
                            className="bg-card border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition-all group relative"
                        >
                            <div
                                onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
                                className="cursor-pointer"
                            >
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
                                                            navigate(`/knowledge-bases/${kb.id}`);
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
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {kb.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Created {formatDate(kb.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
        </div>
    );
}
