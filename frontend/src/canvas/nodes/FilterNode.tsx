import { Filter as FilterIcon } from "lucide-react";
import { memo } from "react";
import { BaseNode } from "./BaseNode";
import type { NodeProps } from "reactflow";

interface FilterNodeData {
    label?: string;
    inputArray?: string;
    expression?: string;
    mode?: "keep" | "remove";
    outputVariable?: string;
    removedVariable?: string;
}

function FilterNode({ data, selected }: NodeProps<FilterNodeData>) {
    const label = data.label || "Filter";

    const mode = data.mode || "keep";
    const expression = data.expression || "";

    const preview =
        expression.length > 80 ? expression.slice(0, 80) + "…" : expression || "No expression";

    return (
        <BaseNode
            icon={FilterIcon}
            label={label}
            category="tools"
            subcategory="data-processing"
            selected={selected}
        >
            <div className="flex flex-col text-xs gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="font-medium">{mode}</span>
                </div>

                <div className="border border-border rounded bg-muted/40 px-2 py-1.5 max-h-24 overflow-auto">
                    <div className="text-[10px] text-muted-foreground mb-1">Expression</div>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                        {preview}
                    </pre>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(FilterNode);
