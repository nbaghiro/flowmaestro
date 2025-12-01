import { X, Search, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { getWorkflows } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Spinner } from "../common/Spinner";

interface Workflow {
    id: string;
    name: string;
    description?: string;
}

interface AddWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (workflows: Workflow[]) => void;
    existingToolIds: string[];
}

export function AddWorkflowDialog({
    isOpen,
    onClose,
    onAdd,
    existingToolIds
}: AddWorkflowDialogProps) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadWorkflows();
        }
    }, [isOpen]);

    const loadWorkflows = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getWorkflows();
            if (response.success && response.data) {
                setWorkflows(response.data.items || []);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load workflows");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleWorkflow = (workflowId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(workflowId)) {
            newSelected.delete(workflowId);
        } else {
            newSelected.add(workflowId);
        }
        setSelectedIds(newSelected);
    };

    const handleAdd = () => {
        const selectedWorkflows = workflows.filter((w) => selectedIds.has(w.id));
        onAdd(selectedWorkflows);
        setSelectedIds(new Set());
        setSearchQuery("");
        onClose();
    };

    const filteredWorkflows = workflows.filter((workflow) => {
        // Filter out already connected workflows
        if (existingToolIds.includes(workflow.id)) {
            return false;
        }
        // Search filter
        if (searchQuery) {
            return (
                workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        return true;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Add Workflows</h3>
                    <Button variant="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search workflows..."
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner size="md" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    ) : filteredWorkflows.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                {searchQuery
                                    ? "No workflows found matching your search"
                                    : "No workflows available to add"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredWorkflows.map((workflow) => (
                                <button
                                    key={workflow.id}
                                    onClick={() => handleToggleWorkflow(workflow.id)}
                                    className={cn(
                                        "w-full p-4 rounded-lg border text-left transition-all",
                                        selectedIds.has(workflow.id)
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/50 hover:bg-muted"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={cn(
                                                "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0",
                                                selectedIds.has(workflow.id)
                                                    ? "border-primary bg-primary"
                                                    : "border-border"
                                            )}
                                        >
                                            {selectedIds.has(workflow.id) && (
                                                <svg
                                                    className="w-3 h-3 text-white"
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
                                            <p className="font-medium text-foreground">
                                                {workflow.name}
                                            </p>
                                            {workflow.description && (
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                    {workflow.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        {selectedIds.size} workflow{selectedIds.size !== 1 ? "s" : ""} selected
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
            </div>
        </div>
    );
}
