import { ChevronDown, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface WorkflowContextDisplayProps {
    nodeCount: number;
    edgeCount: number;
    selectedNodeId: string | null;
    contextTimestamp: Date | null;
    onRefresh: () => void;
}

export function WorkflowContextDisplay({
    nodeCount,
    edgeCount,
    selectedNodeId,
    contextTimestamp,
    onRefresh
}: WorkflowContextDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Check if context is stale (>30 seconds old)
    const isStale = contextTimestamp ? Date.now() - contextTimestamp.getTime() > 30000 : false;

    // Calculate time ago
    const getTimeAgo = (): string => {
        if (!contextTimestamp) return "Never";

        const seconds = Math.floor((Date.now() - contextTimestamp.getTime()) / 1000);

        if (seconds < 5) return "Just now";
        if (seconds < 60) return `${seconds}s ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    return (
        <div className="border-b border-border pb-3">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors rounded-lg"
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">
                        Workflow Context
                    </span>
                    {isStale && (
                        <span title="Context is stale">
                            <AlertCircle className="w-3 h-3 text-orange-500" />
                        </span>
                    )}
                </div>
                <span className="text-xs text-muted-foreground">{getTimeAgo()}</span>
            </button>

            {isExpanded && (
                <div className="px-4 py-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-muted-foreground">Nodes</span>
                            <span className="font-medium text-foreground">{nodeCount}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                            <span className="text-muted-foreground">Edges</span>
                            <span className="font-medium text-foreground">{edgeCount}</span>
                        </div>
                    </div>

                    {selectedNodeId && (
                        <div className="p-2 rounded bg-muted/50 text-xs">
                            <span className="text-muted-foreground">Selected: </span>
                            <span className="font-medium text-foreground">{selectedNodeId}</span>
                        </div>
                    )}

                    {nodeCount === 0 && (
                        <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground text-center">
                            Empty workflow
                        </div>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRefresh();
                        }}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded",
                            "bg-primary/10 hover:bg-primary/20 transition-colors",
                            "text-xs font-medium text-primary"
                        )}
                    >
                        <RefreshCw className="w-3 h-3" />
                        Refresh Context
                    </button>

                    {isStale && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                            Context may be outdated
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
