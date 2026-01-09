/**
 * ThinkingBlock Component
 *
 * Collapsible block that displays the AI's thinking/reasoning process
 * during workflow generation. Shows streaming indicator when actively
 * thinking and allows users to expand/collapse the content.
 */

import { Brain, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

interface ThinkingBlockProps {
    /** The thinking content to display */
    content: string;
    /** Whether the thinking block is expanded */
    isExpanded: boolean;
    /** Whether thinking is currently being streamed */
    isStreaming: boolean;
    /** Number of thinking tokens (optional) */
    tokenCount?: number;
    /** Callback when expand/collapse is toggled */
    onToggle: () => void;
}

export function ThinkingBlock({
    content,
    isExpanded,
    isStreaming,
    tokenCount,
    onToggle
}: ThinkingBlockProps) {
    const contentRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom while streaming
    useEffect(() => {
        if (isStreaming && isExpanded && contentRef.current) {
            contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
    }, [content, isStreaming, isExpanded]);

    // Don't render if no content and not streaming
    if (!content && !isStreaming) {
        return null;
    }

    return (
        <div className="mb-3">
            {/* Header - Always visible */}
            <button
                onClick={onToggle}
                className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-t-lg",
                    "text-sm font-medium transition-colors",
                    "bg-violet-500/10 hover:bg-violet-500/15",
                    "text-violet-700 dark:text-violet-400",
                    "border border-violet-500/20",
                    !isExpanded && "rounded-b-lg"
                )}
            >
                {/* Icon */}
                {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Brain className="w-4 h-4" />
                )}

                {/* Label */}
                <span className="flex-1 text-left">{isStreaming ? "Thinking..." : "Thinking"}</span>

                {/* Token count (if available) */}
                {tokenCount !== undefined && tokenCount > 0 && !isStreaming && (
                    <span className="text-xs text-violet-600/60 dark:text-violet-500/60">
                        {tokenCount.toLocaleString()} tokens
                    </span>
                )}

                {/* Expand/Collapse indicator */}
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronRight className="w-4 h-4" />
                )}
            </button>

            {/* Content - Collapsible */}
            {isExpanded && (
                <div
                    ref={contentRef}
                    className={cn(
                        "px-3 py-2 rounded-b-lg",
                        "bg-violet-500/5 border border-t-0 border-violet-500/20",
                        "max-h-64 overflow-y-auto"
                    )}
                >
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                        {content || (
                            <span className="text-violet-600/40 dark:text-violet-500/40 italic">
                                Processing...
                            </span>
                        )}
                        {/* Streaming cursor */}
                        {isStreaming && (
                            <span className="inline-block w-2 h-4 ml-0.5 bg-violet-500/60 animate-pulse" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
