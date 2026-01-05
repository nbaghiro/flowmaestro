import { Bot, ArrowRight, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import type { CreateChatInterfaceInput } from "@flowmaestro/shared";
import { getAgents, createChatInterface } from "../../../lib/api";
import { logger } from "../../../lib/logger";
import { Button } from "../../common/Button";
import { Dialog } from "../../common/Dialog";
import { FormField } from "../../common/FormField";
import { Input } from "../../common/Input";
import { Select, SelectItem } from "../../common/Select";
import { Textarea } from "../../common/Textarea";

interface CreateChatInterfaceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (chatInterface: { id: string; title: string }) => void;
    initialAgentId?: string;
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

export function CreateChatInterfaceDialog({
    isOpen,
    onClose,
    onCreated,
    initialAgentId
}: CreateChatInterfaceDialogProps) {
    // Step state - start at step 2 if initial agent is provided, otherwise step 1
    const [step, setStep] = useState<1 | 2>(initialAgentId ? 2 : 1);

    // Agent selection state
    const [selectedAgentId, setSelectedAgentId] = useState<string>("");

    // Options loaded from API
    const [agents, setAgents] = useState<AgentOption[]>([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(false);

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
            loadAgents();
            // Start at step 2 if initial agent is provided, otherwise step 1
            const initialStep = initialAgentId ? 2 : 1;
            setStep(initialStep);
            // Pre-select agent if provided
            if (initialAgentId) {
                setSelectedAgentId(initialAgentId);
            }
        } else {
            // Reset all state when closing
            const initialStep = initialAgentId ? 2 : 1;
            setStep(initialStep);
            setSelectedAgentId("");
            setTitle("");
            setDescription("");
            setSlug("");
            setSlugEdited(false);
            setError(null);
        }
    }, [isOpen, initialAgentId]);

    // Auto-generate slug from title
    useEffect(() => {
        if (!slugEdited && title) {
            setSlug(generateSlug(title));
        }
    }, [title, slugEdited]);

    // Pre-fill title when starting at step 2 with pre-selected agent
    useEffect(() => {
        if (isOpen && initialAgentId) {
            // Wait for agents to load, then pre-fill title
            if (agents.length > 0) {
                const agent = agents.find((a) => a.id === initialAgentId);
                if (agent && !title) {
                    setTitle(`${agent.name} Chat`);
                }
            }
        }
    }, [isOpen, initialAgentId, agents, title]);

    const loadAgents = async () => {
        setIsLoadingAgents(true);
        try {
            const agentsRes = await getAgents();

            if (agentsRes.success && agentsRes.data) {
                setAgents(
                    agentsRes.data.agents.map((a: { id: string; name: string }) => ({
                        id: a.id,
                        name: a.name
                    }))
                );
            }
        } catch (err) {
            logger.error("Failed to load agents", err);
        } finally {
            setIsLoadingAgents(false);
        }
    };

    const handleNext = () => {
        if (selectedAgentId) {
            // Pre-fill title with agent name
            const agent = agents.find((a) => a.id === selectedAgentId);
            if (agent && !title) {
                setTitle(`${agent.name} Chat`);
            }
            setStep(2);
        }
    };

    const handleBack = () => {
        setStep(1);
        setError(null);
    };

    const handleCreate = async () => {
        if (!selectedAgentId || !title || !slug) return;

        setIsCreating(true);
        setError(null);

        try {
            const input: CreateChatInterfaceInput = {
                name: title.toLowerCase().replace(/\s+/g, "-"),
                slug,
                title,
                description: description || undefined,
                agentId: selectedAgentId
            };

            const response = await createChatInterface(input);

            if (response.success && response.data) {
                onCreated(response.data);
                onClose();
            } else {
                setError(response.error || "Failed to create chat interface");
            }
        } catch (err) {
            logger.error("Failed to create chat interface", err);
            setError(err instanceof Error ? err.message : "Failed to create chat interface");
        } finally {
            setIsCreating(false);
        }
    };

    const canContinue = selectedAgentId;
    const canCreate = title.trim() && slug.trim();

    // Hide steps and back button when starting at step 2 with pre-selected agent
    const hideSteps = !!initialAgentId;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Create Chat Interface" size="lg">
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
                            Select an agent to power this chat interface
                        </p>

                        {/* Agent Selection */}
                        <div className="border rounded-lg p-4 border-primary bg-primary/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-foreground">Agent</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Users will chat with this agent in real-time
                                    </p>
                                </div>
                            </div>

                            <Select
                                value={selectedAgentId}
                                onChange={(value) => setSelectedAgentId(value)}
                                disabled={isLoadingAgents}
                                placeholder="Select an agent..."
                            >
                                {agents.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name}
                                    </SelectItem>
                                ))}
                            </Select>

                            {agents.length === 0 && !isLoadingAgents && (
                                <p className="text-sm text-muted-foreground mt-3">
                                    No agents found. Create an agent first to power chat interfaces.
                                </p>
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
                                Give your chat interface a name
                            </p>
                        )}

                        <div className="space-y-4">
                            <FormField label="Title *">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="My Chat Interface"
                                    autoFocus
                                />
                            </FormField>

                            <FormField label="Description">
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this chat does..."
                                    rows={3}
                                />
                            </FormField>

                            <FormField label="URL Slug *">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">/c/</span>
                                    <Input
                                        value={slug}
                                        onChange={(e) => {
                                            setSlug(e.target.value);
                                            setSlugEdited(true);
                                        }}
                                        placeholder="my-chat"
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
