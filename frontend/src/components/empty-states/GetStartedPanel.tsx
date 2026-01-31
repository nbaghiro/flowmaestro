import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
    AgentIllustration,
    ChatIllustration,
    FormIllustration,
    WorkflowIllustration
} from "./illustrations";
import { QuickCreateCard } from "./QuickCreateCard";

interface GetStartedPanelProps {
    onCreateWorkflow: () => void;
    onCreateAgent: () => void;
    onCreateChatInterface: () => void;
    onCreateFormInterface: () => void;
    onAIGenerate?: (prompt: string) => void;
    className?: string;
}

/**
 * Get Started panel shown on the home page when all sections are empty.
 * Displays quick-create options for all entity types and an AI generation input.
 */
export function GetStartedPanel({
    onCreateWorkflow,
    onCreateAgent,
    onCreateChatInterface,
    onCreateFormInterface,
    onAIGenerate,
    className
}: GetStartedPanelProps) {
    const navigate = useNavigate();
    const [aiPrompt, setAiPrompt] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAISubmit = async () => {
        if (!aiPrompt.trim() || !onAIGenerate || isSubmitting) return;

        setIsSubmitting(true);
        try {
            onAIGenerate(aiPrompt.trim());
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAISubmit();
        }
    };

    return (
        <div
            className={cn(
                "flex flex-col items-center p-8 bg-card border border-border rounded-lg",
                className
            )}
        >
            {/* Header */}
            <h2 className="text-xl font-semibold text-foreground mb-8">
                What would you like to build?
            </h2>

            {/* Quick create cards */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
                <QuickCreateCard
                    icon={<WorkflowIllustration className="scale-75" />}
                    label="Workflow"
                    onClick={onCreateWorkflow}
                />
                <QuickCreateCard
                    icon={<AgentIllustration className="scale-75" />}
                    label="Agent"
                    onClick={onCreateAgent}
                />
                <QuickCreateCard
                    icon={<ChatIllustration className="scale-75" />}
                    label="Chat"
                    onClick={onCreateChatInterface}
                />
                <QuickCreateCard
                    icon={<FormIllustration className="scale-75" />}
                    label="Form"
                    onClick={onCreateFormInterface}
                />
            </div>

            {/* AI generation input */}
            {onAIGenerate && (
                <div className="w-full max-w-xl">
                    <div className="relative flex items-center">
                        <Sparkles className="absolute left-4 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Describe what you want to build..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={cn(
                                "w-full pl-11 pr-12 py-3",
                                "bg-background border border-border rounded-lg",
                                "text-foreground placeholder:text-muted-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            )}
                        />
                        <button
                            onClick={handleAISubmit}
                            disabled={!aiPrompt.trim() || isSubmitting}
                            className={cn(
                                "absolute right-2 p-2 rounded-md",
                                "text-muted-foreground hover:text-foreground",
                                "hover:bg-accent transition-colors",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Browse templates link */}
            <button
                onClick={() => navigate("/templates")}
                className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                Or browse templates
            </button>
        </div>
    );
}
