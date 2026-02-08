/**
 * ToolMessageDisplay Component
 *
 * Renders a tool message from the chat history with status indicator.
 * Used to display persisted tool results in agent conversations.
 */

import { Wrench, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Button } from "../../common/Button";
import type { ThreadMessage } from "../../../lib/api";

interface ToolMessageDisplayProps {
    /**
     * The tool message to display
     */
    message: ThreadMessage;
    /**
     * Callback when view details button is clicked
     */
    onViewDetails?: (content: string) => void;
}

/**
 * Displays a tool message with status badge and view details button.
 */
export function ToolMessageDisplay({ message, onViewDetails }: ToolMessageDisplayProps) {
    const isError =
        message.content.includes('"error":true') ||
        message.content.includes("Validation errors") ||
        message.content.toLowerCase().includes('"error"');

    let toolName = message.tool_name || "unknown";
    if (toolName === "unknown") {
        try {
            const parsed = JSON.parse(message.content);
            toolName = parsed.toolName || parsed.tool || toolName;
        } catch {
            // Keep "unknown"
        }
    }

    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted/50 border border-border">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Using tool - {toolName}</span>
                    {isError ? (
                        <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Failed
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Success
                        </span>
                    )}
                    {onViewDetails && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto py-0.5 px-2"
                            onClick={() => onViewDetails(message.content)}
                        >
                            <Eye className="w-3 h-3 mr-1" />
                            {isError ? "View Error" : "View Result"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
