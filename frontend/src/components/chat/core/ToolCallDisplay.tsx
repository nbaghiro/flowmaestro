/**
 * ToolCallDisplay Component
 *
 * Displays tool call status with loading, success, and error states.
 * Used in agent chats to show tool execution progress.
 */

import { Wrench, Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { type ReactNode } from "react";
import type { JsonObject } from "@flowmaestro/shared";
import { cn } from "../../../lib/utils";
import { Button } from "../../common/Button";

type ToolCallStatus = "running" | "success" | "failed";

interface ToolCallInfo {
    id: string;
    toolName: string;
    status: ToolCallStatus;
    arguments?: JsonObject;
    result?: JsonObject;
    error?: string;
}

interface ToolCallDisplayProps {
    /**
     * Tool call information
     */
    toolCall: ToolCallInfo;
    /**
     * Callback when view details button is clicked
     */
    onViewDetails?: (toolCall: ToolCallInfo) => void;
    /**
     * Additional class name
     */
    className?: string;
}

/**
 * Status badge component for tool calls
 */
function StatusBadge({ status }: { status: ToolCallStatus }) {
    switch (status) {
        case "running":
            return <Loader2 className="w-4 h-4 animate-spin text-amber-500" />;
        case "success":
            return (
                <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Success
                </span>
            );
        case "failed":
            return (
                <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">
                    <XCircle className="w-3 h-3" />
                    Failed
                </span>
            );
    }
}

/**
 * Single tool call display with status indicator.
 *
 * @example
 * ```tsx
 * <ToolCallDisplay
 *   toolCall={{
 *     id: "tool-1",
 *     toolName: "web_search",
 *     status: "running"
 *   }}
 *   onViewDetails={(tc) => setSelectedTool(tc)}
 * />
 * ```
 */
export function ToolCallDisplay({ toolCall, onViewDetails, className }: ToolCallDisplayProps) {
    const showDetailsButton = toolCall.status !== "running" && onViewDetails;

    return (
        <div className={cn("flex gap-3", className)}>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted/50 border border-border">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Using tool - {toolCall.toolName}</span>
                    <StatusBadge status={toolCall.status} />
                    {showDetailsButton && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-0.5 px-2"
                            onClick={() => onViewDetails(toolCall)}
                        >
                            <Eye className="w-3 h-3 mr-1" />
                            {toolCall.status === "failed" ? "View Error" : "View Result"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

interface ToolCallListProps {
    /**
     * List of tool calls to display
     */
    toolCalls: ToolCallInfo[];
    /**
     * Callback when view details button is clicked
     */
    onViewDetails?: (toolCall: ToolCallInfo) => void;
    /**
     * Additional class name
     */
    className?: string;
}

/**
 * List of tool calls.
 *
 * @example
 * ```tsx
 * <ToolCallList
 *   toolCalls={currentToolCalls}
 *   onViewDetails={(tc) => setSelectedTool(tc)}
 * />
 * ```
 */
export function ToolCallList({ toolCalls, onViewDetails, className }: ToolCallListProps) {
    if (toolCalls.length === 0) {
        return null;
    }

    return (
        <div className={cn("space-y-2", className)}>
            {toolCalls.map((toolCall) => (
                <ToolCallDisplay
                    key={toolCall.id}
                    toolCall={toolCall}
                    onViewDetails={onViewDetails}
                />
            ))}
        </div>
    );
}

interface ToolResultDialogContentProps {
    /**
     * Content to display (JSON stringified or error message)
     */
    content: string;
    /**
     * Whether this is an error display
     * @default false
     */
    isError?: boolean;
    /**
     * Custom renderer for content
     */
    customRenderer?: (content: string) => ReactNode;
}

/**
 * Content component for displaying tool results in a dialog.
 *
 * @example
 * ```tsx
 * <Dialog
 *   isOpen={!!selectedTool}
 *   onClose={() => setSelectedTool(null)}
 *   title={`Tool Details - ${selectedTool?.toolName}`}
 * >
 *   <ToolResultDialogContent
 *     content={selectedTool.error || JSON.stringify(selectedTool.result, null, 2)}
 *     isError={selectedTool.status === "failed"}
 *   />
 * </Dialog>
 * ```
 */
export function ToolResultDialogContent({
    content,
    isError = false,
    customRenderer
}: ToolResultDialogContentProps) {
    // Try to parse and format JSON
    let displayContent: ReactNode;

    if (customRenderer) {
        displayContent = customRenderer(content);
    } else {
        try {
            const parsed = JSON.parse(content);
            displayContent = (
                <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto font-mono">
                    {JSON.stringify(parsed, null, 2)}
                </pre>
            );
        } catch {
            displayContent = (
                <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-96 overflow-y-auto font-mono">
                    {content}
                </pre>
            );
        }
    }

    return (
        <div className="space-y-4">
            <div
                className={cn(
                    "bg-muted border rounded-lg p-4",
                    isError ? "border-red-500/20" : "border-border"
                )}
            >
                {displayContent}
            </div>
        </div>
    );
}

// Export types for external use
export type { ToolCallInfo, ToolCallStatus };
