import { Workflow, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import type { FormInterfaceTargetType } from "@flowmaestro/shared";
import { getWorkflows, getAgents } from "../../lib/api";
import { logger } from "../../lib/logger";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Select, SelectItem } from "../common/Select";

interface TargetSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (targetType: FormInterfaceTargetType, targetId: string) => void;
}

interface WorkflowOption {
    id: string;
    name: string;
}

interface AgentOption {
    id: string;
    name: string;
}

export function TargetSelectionDialog({ isOpen, onClose, onSelect }: TargetSelectionDialogProps) {
    const [selectedType, setSelectedType] = useState<FormInterfaceTargetType | null>(null);
    const [selectedId, setSelectedId] = useState<string>("");

    const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
    const [agents, setAgents] = useState<AgentOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load workflows and agents when dialog opens
    useEffect(() => {
        if (isOpen) {
            loadOptions();
        } else {
            // Reset state when closing
            setSelectedType(null);
            setSelectedId("");
        }
    }, [isOpen]);

    const loadOptions = async () => {
        setIsLoading(true);
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
        } catch (error) {
            logger.error("Failed to load workflows/agents", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = () => {
        if (selectedType && selectedId) {
            onSelect(selectedType, selectedId);
        }
    };

    const canContinue = selectedType && selectedId;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Create Form Interface" size="lg">
            <div className="space-y-6">
                <p className="text-muted-foreground">What should this form interface connect to?</p>

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
                                disabled={isLoading}
                                placeholder="Select a workflow..."
                            >
                                {workflows.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        {w.name}
                                    </SelectItem>
                                ))}
                            </Select>
                            {workflows.length === 0 && !isLoading && (
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
                                disabled={isLoading}
                                placeholder="Select an agent..."
                            >
                                {agents.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.name}
                                    </SelectItem>
                                ))}
                            </Select>
                            {agents.length === 0 && !isLoading && (
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
                    <Button variant="primary" onClick={handleContinue} disabled={!canContinue}>
                        Continue
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
