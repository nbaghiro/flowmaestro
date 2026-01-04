import { MessageCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ChatInterfaceSuggestedPrompt } from "@flowmaestro/shared";

interface SuggestedPromptsProps {
    prompts: ChatInterfaceSuggestedPrompt[];
    onSelect: (text: string) => void;
}

export function SuggestedPrompts({ prompts, onSelect }: SuggestedPromptsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (prompts.length === 0) return null;

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
                <span className="text-xs text-muted-foreground">{prompts.length}</span>
            </button>

            {isExpanded && (
                <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-2">
                        {prompts.map((prompt, index) => (
                            <button
                                key={index}
                                onClick={() => onSelect(prompt.text)}
                                className="px-3 py-1.5 rounded-lg text-xs bg-muted/50 hover:bg-muted transition-colors text-foreground text-left border border-border hover:border-primary/50"
                            >
                                {prompt.icon && <span className="mr-1.5">{prompt.icon}</span>}
                                {prompt.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
