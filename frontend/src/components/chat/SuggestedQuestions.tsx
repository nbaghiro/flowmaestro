import { MessageCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface SuggestedQuestionsProps {
    onQuestionClick: (question: string) => void;
    hasNodes: boolean;
    hasSelectedNode: boolean;
    disabled?: boolean;
}

interface SuggestedQuestion {
    text: string;
    showWhen: "always" | "hasNodes" | "hasSelectedNode" | "empty";
}

const suggestedQuestions: SuggestedQuestion[] = [
    {
        text: "Give me an overview of how this workflow works",
        showWhen: "hasNodes"
    },
    {
        text: "Help me debug this workflow and identify potential issues",
        showWhen: "hasNodes"
    },
    {
        text: "Add an HTTP node to call an external API",
        showWhen: "always"
    },
    {
        text: "Suggest optimizations to make this workflow more efficient",
        showWhen: "hasNodes"
    },
    {
        text: "Modify the selected node to improve its configuration",
        showWhen: "hasSelectedNode"
    },
    {
        text: "Clean up and remove any unnecessary nodes",
        showWhen: "hasNodes"
    },
    {
        text: "Help me build a workflow that processes data with an LLM",
        showWhen: "empty"
    }
];

export function SuggestedQuestions({
    onQuestionClick,
    hasNodes,
    hasSelectedNode,
    disabled = false
}: SuggestedQuestionsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const shouldShowQuestion = (question: SuggestedQuestion): boolean => {
        if (question.showWhen === "always") return true;
        if (question.showWhen === "hasNodes") return hasNodes;
        if (question.showWhen === "hasSelectedNode") return hasSelectedNode;
        if (question.showWhen === "empty") return !hasNodes;
        return true;
    };

    const visibleQuestions = suggestedQuestions.filter(shouldShowQuestion);

    if (visibleQuestions.length === 0) {
        return null;
    }

    return (
        <div className="border-t border-border flex-shrink-0">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Suggested Questions</p>
                </div>
                <span className="text-xs text-muted-foreground">{visibleQuestions.length}</span>
            </button>

            {isExpanded && (
                <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-2">
                        {visibleQuestions.map((question, index) => (
                            <button
                                key={index}
                                onClick={() => onQuestionClick(question.text)}
                                disabled={disabled}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs",
                                    "bg-muted/50 hover:bg-muted transition-colors",
                                    "text-foreground text-left",
                                    "border border-border hover:border-primary/50",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                {question.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
