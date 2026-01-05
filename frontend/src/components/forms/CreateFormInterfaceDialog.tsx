import { Workflow, Bot, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import type { FormInterfaceTargetType, CreateFormInterfaceInput } from "@flowmaestro/shared";
import { getWorkflows, getAgents, createFormInterface } from "../../lib/api";
import { logger } from "../../lib/logger";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { FormField } from "../common/FormField";
import { Input } from "../common/Input";
import { Select, SelectItem } from "../common/Select";
import { Textarea } from "../common/Textarea";

interface CreateFormInterfaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (formInterface: { id: string; title: string }) => void;
    initialWorkflowId?: string;
    initialAgentId?: string;
}

interface WorkflowOption {
    id: string;
    name: string;
}

interface AgentOption {
    id: string;
    name: string;
}

// Generate slug from title
function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);
}

export function CreateFormInterfaceDialog({
    isOpen,
    onClose,
    onCreated,
    initialWorkflowId,
    initialAgentId
}: CreateFormInterfaceDialogProps) {
    // Step state - start at step 2 if initial target is provided, otherwise step 1
    const [step, setStep] = useState<1 | 2>(initialWorkflowId || initialAgentId ? 2 : 1);

    // Target selection state
    const [selectedType, setSelectedType] = useState<FormInterfaceTargetType | null>(null);
    const [selectedId, setSelectedId] = useState<string>("");

    // Options loaded from API
    const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
    const [agents, setAgents] = useState<AgentOption[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    // Form details state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [slug, setSlug] = useState("");
    const [slugEdited, setSlugEdited] = useState(false);

    // Submission state
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (isOpen) {
            loadOptions();
            // Start at step 2 if initial target is provided, otherwise step 1
            const initialStep = initialWorkflowId || initialAgentId ? 2 : 1;
            setStep(initialStep);
            // Pre-select target if provided
            if (initialWorkflowId) {
                setSelectedType("workflow");
                setSelectedId(initialWorkflowId);
            } else if (initialAgentId) {
                setSelectedType("agent");
                setSelectedId(initialAgentId);
            }
        } else {
            // Reset all state when closing
            const initialStep = initialWorkflowId || initialAgentId ? 2 : 1;
            setStep(initialStep);
            setSelectedType(null);
            setSelectedId("");
            setTitle("");
            setDescription("");
            setSlug("");
            setSlugEdited(false);
            setError(null);
        }
    }, [isOpen, initialWorkflowId, initialAgentId]);

    // Auto-generate slug from title
    useEffect(() => {
        if (!slugEdited && title) {
            setSlug(generateSlug(title));
        }
    }, [title, slugEdited]);

    const loadOptions = async () => {
        setIsLoadingOptions(true);
        try {
            const [workflowsRes, agentsRes] = await Promise.all([getWorkflows(), getAgents()]);

            if (workflowsRes.success && workflowsRes.data) {
                setWorkflows(
                    workflowsRes.data.items.map((w: { id: string; name: string }) => ({
                        id: w.id,
                        name: w.name
                    }))
                );
            }

            if (agentsRes.success && agentsRes.data) {
                setAgents(
                    agentsRes.data.agents.map((a: { id: string; name: string }) => ({
                        id: a.id,
                        name: a.name
                    }))
                );
            }
        } catch (err) {
            logger.error("Failed to load workflows/agents", err);
        } finally {
            setIsLoadingOptions(false);
        }
    };

    const handleNext = () => {
        if (selectedType && selectedId) {
            // Pre-fill title with target name
            const target =
                selectedType === "workflow"
                    ? workflows.find((w) => w.id === selectedId)
                    : agents.find((a) => a.id === selectedId);
            if (target && !title) {
                setTitle(target.name);
            }
            setStep(2);
        }
    };

    // Pre-fill title when starting at step 2 with pre-selected target
    useEffect(() => {
        if (isOpen && (initialWorkflowId || initialAgentId)) {
            // Wait for options to load, then pre-fill title
            if (
                (initialWorkflowId && workflows.length > 0) ||
                (initialAgentId && agents.length > 0)
            ) {
                const target =
                    initialWorkflowId && workflows.length > 0
                        ? workflows.find((w) => w.id === initialWorkflowId)
                        : initialAgentId && agents.length > 0
                          ? agents.find((a) => a.id === initialAgentId)
                          : null;
                if (target && !title) {
                    setTitle(target.name);
                }
            }
        }
    }, [isOpen, initialWorkflowId, initialAgentId, workflows, agents, title]);

    const handleBack = () => {
        setStep(1);
        setError(null);
    };

    const handleCreate = async () => {
        if (!selectedType || !selectedId || !title || !slug) return;

        setIsCreating(true);
        setError(null);

        try {
            const input: CreateFormInterfaceInput = {
                name: title.toLowerCase().replace(/\s+/g, "-"),
                slug,
                title,
                description: description || undefined,
                targetType: selectedType,
                workflowId: selectedType === "workflow" ? selectedId : undefined,
                agentId: selectedType === "agent" ? selectedId : undefined
            };

            const response = await createFormInterface(input);

            if (response.success && response.data) {
                onCreated(response.data);
                onClose();
            } else {
                setError(response.error || "Failed to create form interface");
            }
        } catch (err) {
            logger.error("Failed to create form interface", err);
            setError(err instanceof Error ? err.message : "Failed to create form interface");
        } finally {
            setIsCreating(false);
        }
    };

    const canContinue = selectedType && selectedId;
    const canCreate = title.trim() && slug.trim();

    // Hide steps and back button when starting at step 2 with pre-selected target
    const hideSteps = !!(initialWorkflowId || initialAgentId);

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Create Form Interface" size="lg">
            <div className="space-y-6">
                {/* Step indicator - only show when not in simplified mode */}
                {!hideSteps && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                        >
                            1
                        </span>
                        <div className="w-8 h-px bg-border" />
                        <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                        >
                            2
                        </span>
                    </div>
                )}

                {step === 1 && (
                    <>
                        <p className="text-muted-foreground text-center">
                            What should this form interface connect to?
                        </p>

                        {/* Workflow Option */}
                        <div
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedType === "workflow"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => {
                                setSelectedType("workflow");
                                setSelectedId("");
                            }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className={`p-2 rounded-lg ${
                                        selectedType === "workflow"
                                            ? "bg-primary/10 text-primary"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    <Workflow className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-foreground">Workflow</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Execute a workflow when user submits the form
                                    </p>
                                </div>
                            </div>

                            {selectedType === "workflow" && (
                                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        value={selectedId}
                                        onChange={(value) => setSelectedId(value)}
                                        disabled={isLoadingOptions}
                                        placeholder="Select a workflow..."
                                    >
                                        {workflows.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                    {workflows.length === 0 && !isLoadingOptions && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            No workflows found. Create a workflow first.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Agent Option */}
                        <div
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedType === "agent"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            }`}
                            onClick={() => {
                                setSelectedType("agent");
                                setSelectedId("");
                            }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className={`p-2 rounded-lg ${
                                        selectedType === "agent"
                                            ? "bg-primary/10 text-primary"
                                            : "bg-muted text-muted-foreground"
                                    }`}
                                >
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-foreground">Agent</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Start an agent conversation when user submits
                                    </p>
                                </div>
                            </div>

                            {selectedType === "agent" && (
                                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        value={selectedId}
                                        onChange={(value) => setSelectedId(value)}
                                        disabled={isLoadingOptions}
                                        placeholder="Select an agent..."
                                    >
                                        {agents.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                    {agents.length === 0 && !isLoadingOptions && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            No agents found. Create an agent first.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleNext} disabled={!canContinue}>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        {!hideSteps && (
                            <p className="text-muted-foreground text-center">
                                Give your form interface a name
                            </p>
                        )}

                        <div className="space-y-4">
                            <FormField label="Title *">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="My Form Interface"
                                    autoFocus
                                />
                            </FormField>

                            <FormField label="Description">
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this form does..."
                                    rows={3}
                                />
                            </FormField>

                            <FormField label="URL Slug *">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">/i/</span>
                                    <Input
                                        value={slug}
                                        onChange={(e) => {
                                            setSlug(e.target.value);
                                            setSlugEdited(true);
                                        }}
                                        placeholder="my-form"
                                        className="flex-1"
                                    />
                                </div>
                            </FormField>

                            {error && (
                                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            {!hideSteps && (
                                <Button variant="ghost" onClick={handleBack}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                            )}
                            <div
                                className={`flex items-center gap-3 ${hideSteps ? "w-full justify-end" : ""}`}
                            >
                                <Button variant="ghost" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleCreate}
                                    disabled={!canCreate || isCreating}
                                >
                                    {isCreating ? "Creating..." : "Create"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Dialog>
    );
}
