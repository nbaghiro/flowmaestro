import { Search, FileText, Check } from "lucide-react";
import { useState, useEffect, memo, useMemo } from "react";
import type { WorkflowSummary } from "@flowmaestro/shared";
import { getWorkflows } from "../../lib/api";
import { cn } from "../../lib/utils";
import { extractProvidersFromNodes } from "../../lib/workflowUtils";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Input } from "../common/Input";
import { ProviderIconList } from "../common/ProviderIconList";
import { Spinner } from "../common/Spinner";
import { WorkflowCanvasPreview } from "../common/WorkflowCanvasPreview";

interface AddWorkflowDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (workflows: WorkflowSummary[]) => void;
    existingToolIds: string[];
}

// Memoized selectable card component
const SelectableWorkflowCard = memo(function SelectableWorkflowCard({
    workflow,
    isSelected,
    onToggle
}: {
    workflow: WorkflowSummary;
    isSelected: boolean;
    onToggle: () => void;
}) {
    const definition = workflow.definition as
        | {
              nodes?: Record<string, { type: string; config?: { provider?: string } }>;
              edges?: Array<{ source: string; target: string }>;
          }
        | undefined;

    const providers = useMemo(
        () => extractProvidersFromNodes(definition?.nodes),
        [definition?.nodes]
    );

    return (
        <button
            onClick={onToggle}
            className={cn(
                "relative bg-card border rounded-lg overflow-hidden text-left transition-all hover:shadow-md",
                isSelected
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : "border-border hover:border-primary/50"
            )}
        >
            {/* Canvas Preview */}
            <div className="relative">
                <WorkflowCanvasPreview
                    definition={definition}
                    height="h-28"
                    className="border-b border-border"
                />
                {/* Selection indicator - top right corner */}
                <div
                    className={cn(
                        "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all",
                        isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/80 border border-border"
                    )}
                >
                    {isSelected && <Check className="w-4 h-4" />}
                </div>
            </div>

            {/* Content */}
            <div className="p-3">
                <h4 className="font-medium text-foreground text-sm line-clamp-1">
                    {workflow.name}
                </h4>
                {workflow.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {workflow.description}
                    </p>
                )}
                <ProviderIconList
                    providers={providers}
                    maxVisible={4}
                    iconSize="sm"
                    className="mt-2"
                />
            </div>
        </button>
    );
});

export function AddWorkflowDialog({
    isOpen,
    onClose,
    onAdd,
    existingToolIds
}: AddWorkflowDialogProps) {
    const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
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

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Add Workflows"
            size="4xl"
            maxHeight="80vh"
            footer={
                <div className="flex items-center justify-between">
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
                        placeholder="Search workflows..."
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
                    <div className="grid grid-cols-2 gap-4">
                        {filteredWorkflows.map((workflow) => (
                            <SelectableWorkflowCard
                                key={workflow.id}
                                workflow={workflow}
                                isSelected={selectedIds.has(workflow.id)}
                                onToggle={() => handleToggleWorkflow(workflow.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Dialog>
    );
}
