import { Search, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { getKnowledgeBases, type KnowledgeBase } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { Spinner } from "../common/Spinner";

interface AddKnowledgeBaseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (knowledgeBases: KnowledgeBase[]) => void;
    existingKnowledgeBaseIds: string[];
}

export function AddKnowledgeBaseDialog({
    isOpen,
    onClose,
    onAdd,
    existingKnowledgeBaseIds
}: AddKnowledgeBaseDialogProps) {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadKnowledgeBases();
        }
    }, [isOpen]);

    const loadKnowledgeBases = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getKnowledgeBases();
            if (response.success && response.data) {
                setKnowledgeBases(response.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load knowledge bases");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleKnowledgeBase = (kbId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(kbId)) {
            newSelected.delete(kbId);
        } else {
            newSelected.add(kbId);
        }
        setSelectedIds(newSelected);
    };

    const handleAdd = () => {
        const selectedKnowledgeBases = knowledgeBases.filter((kb) => selectedIds.has(kb.id));
        onAdd(selectedKnowledgeBases);
        setSelectedIds(new Set());
        setSearchQuery("");
        onClose();
    };

    const filteredKnowledgeBases = knowledgeBases.filter((kb) => {
        // Filter out already connected knowledge bases
        if (existingKnowledgeBaseIds.includes(kb.id)) {
            return false;
        }
        // Search filter
        if (searchQuery) {
            return (
                kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return true;
    });

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Add Knowledge Bases"
            size="2xl"
            maxHeight="80vh"
            footer={
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {selectedIds.size} knowledge base{selectedIds.size !== 1 ? "s" : ""}{" "}
                        selected
                    </p>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAdd}
                            disabled={selectedIds.size === 0}
                        >
                            Add {selectedIds.size > 0 && `(${selectedIds.size})`}
                        </Button>
                    </div>
                </div>
            }
        >
            {/* Search */}
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search knowledge bases..."
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[200px]">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Spinner size="md" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                ) : filteredKnowledgeBases.length === 0 ? (
                    <div className="text-center py-12">
                        <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? "No knowledge bases found matching your search"
                                : "No knowledge bases available to add"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredKnowledgeBases.map((kb) => (
                            <button
                                key={kb.id}
                                onClick={() => handleToggleKnowledgeBase(kb.id)}
                                className={cn(
                                    "w-full p-4 rounded-lg border text-left transition-all",
                                    selectedIds.has(kb.id)
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50 hover:bg-accent"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0",
                                            selectedIds.has(kb.id)
                                                ? "border-primary bg-primary"
                                                : "border-muted-foreground/50"
                                        )}
                                    >
                                        {selectedIds.has(kb.id) && (
                                            <svg
                                                className="w-3 h-3 text-primary-foreground"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={3}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground">{kb.name}</p>
                                        {kb.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {kb.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Dialog>
    );
}
