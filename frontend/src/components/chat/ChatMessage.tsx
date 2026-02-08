import { Bot, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { MarkdownRenderer } from "../common/MarkdownRenderer";
import { TypingDots } from "../common/TypingDots";
import type { ChatMessage as ChatMessageType, NodeChange } from "../../stores/chatStore";

interface ChatMessageProps {
    message: ChatMessageType;
    isStreaming?: boolean;
    onApplyChanges?: (changes: NodeChange[]) => void;
    onRejectChanges?: () => void;
}

export function ChatMessage({
    message,
    isStreaming = false,
    onApplyChanges,
    onRejectChanges
}: ChatMessageProps) {
    // System messages (center-aligned, muted)
    if (message.role === "system") {
        return (
            <div className="flex justify-center my-2">
                <p className="text-xs text-muted-foreground italic max-w-[80%] text-center">
                    {message.content}
                </p>
            </div>
        );
    }

    // User messages (right-aligned)
    if (message.role === "user") {
        return (
            <div className="flex gap-3 justify-end">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-primary text-primary-foreground">
                    <MarkdownRenderer content={message.content} className="prose-invert" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                </div>
            </div>
        );
    }

    // Assistant messages (left-aligned)
    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 max-w-[80%]">
                <div className="rounded-lg px-4 py-3 bg-muted text-foreground">
                    {isStreaming && !message.content ? (
                        <TypingDots />
                    ) : (
                        <MarkdownRenderer content={message.content} />
                    )}
                </div>

                {/* Proposed Changes Preview */}
                {message.proposedChanges && message.proposedChanges.length > 0 && (
                    <div className="mt-3 border rounded-lg p-3 bg-primary/5 border-primary/20">
                        <p className="text-sm font-medium mb-2 text-foreground">
                            Proposed Changes:
                        </p>
                        <div className="space-y-2 mb-3">
                            {message.proposedChanges.map((change, idx) => (
                                <div key={idx} className="text-sm">
                                    {change.type === "add" && (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-600 dark:text-green-400 font-medium">
                                                    +
                                                </span>
                                                <span className="text-foreground font-medium">
                                                    Add {change.nodeType} node
                                                    {change.nodeLabel && `: ${change.nodeLabel}`}
                                                </span>
                                            </div>
                                            {change.connectTo && (
                                                <div className="ml-6 text-xs text-muted-foreground">
                                                    → Connect to: {change.connectTo}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {change.type === "modify" && (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                    ⚡
                                                </span>
                                                <span className="text-foreground font-medium">
                                                    Modify: {change.nodeId}
                                                </span>
                                            </div>
                                            {change.updates && (
                                                <div className="ml-6 text-xs text-muted-foreground">
                                                    {change.updates.label &&
                                                        `Label: ${change.updates.label}`}
                                                    {change.updates.config &&
                                                        ` • Config updates: ${Object.keys(change.updates.config).length} field${Object.keys(change.updates.config).length !== 1 ? "s" : ""}`}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {change.type === "remove" && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                                −
                                            </span>
                                            <span className="text-foreground font-medium">
                                                Remove: {change.nodeId}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onApplyChanges?.(message.proposedChanges!)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium",
                                    "bg-primary text-primary-foreground",
                                    "hover:bg-primary/90 transition-colors"
                                )}
                            >
                                Apply Changes
                            </button>
                            <button
                                onClick={onRejectChanges}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm font-medium",
                                    "bg-muted text-foreground",
                                    "hover:bg-muted/80 transition-colors"
                                )}
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
