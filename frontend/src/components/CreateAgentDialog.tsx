import { ChevronLeft, ArrowRight, Bot } from "lucide-react";
import {
    Plus,
    Code,
    Headphones,
    BarChart3,
    PenTool,
    Search,
    DollarSign,
    GitPullRequestDraft,
    UserPlus,
    type LucideIcon
} from "lucide-react";
import { useState, FormEvent } from "react";
import { AgentPatternPicker } from "./AgentPatternPicker";
import { Alert } from "./common/Alert";
import { Button } from "./common/Button";
import { Dialog } from "./common/Dialog";
import { Input } from "./common/Input";
import { Textarea } from "./common/Textarea";
import type { AgentPattern } from "../lib/agentPatterns";

// Icon mapping (subset for the selected pattern indicator)

const iconMap: Record<string, LucideIcon> = {
    Plus,
    Bot,
    Code,
    Headphones,
    BarChart3,
    PenTool,
    Search,
    DollarSign,
    GitPullRequestDraft,
    UserPlus
};

export interface AgentPatternData {
    pattern: AgentPattern;
    name: string;
    description?: string;
}

interface CreateAgentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (patternData: AgentPatternData) => void;
}

type DialogStep = "pattern" | "details";

export function CreateAgentDialog({ isOpen, onClose, onCreate }: CreateAgentDialogProps) {
    // Step state
    const [step, setStep] = useState<DialogStep>("pattern");

    // Pattern selection state
    const [selectedPattern, setSelectedPattern] = useState<AgentPattern | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // UI state
    const [error, setError] = useState("");

    const handlePatternSelect = (pattern: AgentPattern) => {
        setSelectedPattern(pattern);
        setError("");
    };

    const handlePatternNext = () => {
        if (selectedPattern) {
            // Pre-fill name and description from pattern
            setName(`Starter - ${selectedPattern.name}`);
            setDescription(selectedPattern.description);
            setStep("details");
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError("");

        const agentName = name.trim();

        if (!agentName) {
            setError("Agent name is required");
            return;
        }

        if (!selectedPattern) {
            setError("Please select a pattern");
            return;
        }

        onCreate({
            pattern: selectedPattern,
            name: agentName,
            description: description.trim() || undefined
        });

        // Reset form
        resetForm();
    };

    const resetForm = () => {
        setStep("pattern");
        setSelectedPattern(null);
        setName("");
        setDescription("");
        setError("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleBack = () => {
        if (step === "details") {
            setStep("pattern");
            setError("");
        }
    };

    // Determine dialog title based on step
    const getDialogTitle = () => {
        switch (step) {
            case "pattern":
                return "Create New Agent";
            case "details":
                return "Name Your Agent";
            default:
                return "Create New Agent";
        }
    };

    // Determine dialog size based on step
    const getDialogSize = () => {
        return step === "pattern" ? "6xl" : "md";
    };

    // Get icon for selected pattern
    const SelectedPatternIcon = selectedPattern ? iconMap[selectedPattern.icon] || Bot : Bot;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title={getDialogTitle()}
            size={getDialogSize()}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <Alert variant="error">{error}</Alert>}

                {/* Step 1: Pattern Selection */}
                {step === "pattern" && (
                    <div className="flex flex-col">
                        <div className="flex-1 min-h-0">
                            <AgentPatternPicker
                                selectedPatternId={selectedPattern?.id || null}
                                onSelect={handlePatternSelect}
                            />
                        </div>

                        {/* Actions - always visible */}
                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border bg-background sticky bottom-0">
                            <Button type="button" variant="ghost" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handlePatternNext}
                                disabled={!selectedPattern}
                                className="gap-2"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Name & Description */}
                {step === "details" && (
                    <>
                        {/* Selected pattern indicator */}
                        {selectedPattern && (
                            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <SelectedPatternIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {selectedPattern.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedPattern.category} agent
                                    </p>
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="agent-name"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Agent Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                id="agent-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., My Code Assistant"
                                required
                                maxLength={255}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="agent-description"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Description (optional)
                            </label>
                            <Textarea
                                id="agent-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this agent does..."
                                rows={3}
                                maxLength={1000}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                {description.length}/1000 characters
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleBack}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <div className="flex gap-3">
                                <Button type="button" variant="ghost" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={!name.trim()}>
                                    Create Agent
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </form>
        </Dialog>
    );
}
