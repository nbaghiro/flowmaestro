import { Calculator } from "lucide-react";
import { memo } from "react";
import { BaseNode } from "../../BaseNode";
import type { NodeProps } from "reactflow";

interface AggregateNodeData {
    label?: string;
    inputArray?: string;
    operation?: string;
    field?: string;
    groupBy?: string;
    outputVariable?: string;
}

function AggregateNode({ data, selected }: NodeProps<AggregateNodeData>) {
    const label = data.label || "Aggregate";
    const operation = data.operation || "sum";
    const field = data.field || "";
    const groupBy = data.groupBy || "";

    const opPreview = field ? `${operation}(${field})` : operation;

    const groupPreview = groupBy ? `Group by: ${groupBy}` : "";

    return (
        <BaseNode
            icon={Calculator}
            label={label}
            category="tools"
            subcategory="data-processing"
            selected={selected}
        >
            <div className="flex flex-col text-xs gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Operation</span>
                    <span className="font-medium">{opPreview}</span>
                </div>

                {groupBy && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Group By</span>
                        <span className="font-medium">{groupBy}</span>
                    </div>
                )}

                <div className="border border-border rounded bg-muted/40 px-2 py-1.5 max-h-24 overflow-auto">
                    <div className="text-[10px] text-muted-foreground mb-1">Preview</div>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                        {opPreview}
                        {groupPreview ? `\n${groupPreview}` : ""}
                    </pre>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(AggregateNode);
