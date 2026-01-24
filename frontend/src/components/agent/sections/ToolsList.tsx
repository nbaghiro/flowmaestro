import { X } from "lucide-react";
import { cn } from "../../../lib/utils";
import type { Tool } from "../../../lib/api";

interface ToolsListProps {
    tools: Tool[];
    onRemove: (toolId: string) => void;
    isRemoving?: string | null;
}

export function ToolsList({ tools, onRemove, isRemoving }: ToolsListProps) {
    if (tools.length === 0) {
        return null;
    }

    const getToolTypeLabel = (type: Tool["type"]) => {
        switch (type) {
            case "workflow":
                return "Workflow";
            case "function":
                return "Function";
            case "knowledge_base":
                return "Knowledge Base";
            case "mcp":
                return "MCP";
            case "builtin":
                return "Builtin";
        }
    };

    return (
        <div className="space-y-2 mb-4">
            <p className="text-xs text-muted-foreground">Connected Tools</p>
            <div className="flex flex-wrap gap-2">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                            "bg-primary/10 border border-primary/20",
                            "text-sm"
                        )}
                    >
                        <span className="text-xs text-muted-foreground font-medium">
                            {getToolTypeLabel(tool.type)}
                        </span>
                        <span className="text-foreground">{tool.name}</span>
                        <button
                            onClick={() => onRemove(tool.id)}
                            disabled={isRemoving === tool.id}
                            className={cn(
                                "ml-1 p-0.5 rounded hover:bg-destructive/20 transition-colors",
                                "disabled:opacity-50"
                            )}
                            title="Remove tool"
                        >
                            <X className="w-3 h-3 text-destructive" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
