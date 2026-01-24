import { Wrench } from "lucide-react";
import { cn } from "../../../lib/utils";
import { CollapsibleSection } from "./CollapsibleSection";
import { ToolsList } from "./ToolsList";

import type { Tool } from "../../../lib/api";

interface ToolsSectionProps {
    tools: Tool[];
    onRemoveTool: (toolId: string) => void;
    removingToolId: string | null;
    onAddWorkflow: () => void;
    onAddKnowledgeBase: () => void;
    onAddMCP: () => void;
    onAddBuiltinTool: () => void;
}

export function ToolsSection({
    tools,
    onRemoveTool,
    removingToolId,
    onAddWorkflow,
    onAddKnowledgeBase,
    onAddMCP,
    onAddBuiltinTool
}: ToolsSectionProps) {
    // Count tools by type for summary
    const toolCounts = tools.reduce(
        (acc, tool) => {
            acc[tool.type] = (acc[tool.type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    // Generate summary content for collapsed state
    const summaryContent =
        tools.length > 0 ? (
            <div className="flex flex-wrap gap-1">
                {Object.entries(toolCounts).map(([type, count]) => (
                    <span
                        key={type}
                        className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                    >
                        {count} {type.replace("_", " ")}
                    </span>
                ))}
            </div>
        ) : (
            <span className="text-muted-foreground">No tools connected</span>
        );

    const addButtonClass = cn(
        "w-full px-4 py-3 rounded-lg border border-dashed border-border",
        "text-sm text-muted-foreground text-left",
        "hover:border-primary/50 hover:bg-muted transition-colors"
    );

    return (
        <CollapsibleSection
            id="toolsSection"
            title="Tools"
            icon={Wrench}
            badge={tools.length > 0 ? `${tools.length} connected` : undefined}
            summaryContent={summaryContent}
        >
            <p className="text-sm text-muted-foreground mb-3">
                Select the integrations and flows the agent can access
            </p>

            {/* Connected Tools List */}
            <ToolsList tools={tools} onRemove={onRemoveTool} isRemoving={removingToolId} />

            {/* Add Tool Buttons */}
            <div className="space-y-2">
                <button onClick={onAddWorkflow} className={addButtonClass}>
                    + Add a workflow
                </button>
                <button onClick={onAddKnowledgeBase} className={addButtonClass}>
                    + Add a knowledge base
                </button>
                <button onClick={onAddMCP} className={addButtonClass}>
                    + Add an MCP integration
                </button>
                <button onClick={onAddBuiltinTool} className={addButtonClass}>
                    + Add a builtin tool
                </button>
            </div>
        </CollapsibleSection>
    );
}
