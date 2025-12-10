import { Wand2 } from "lucide-react";
import { memo } from "react";
import { BaseNode } from "./BaseNode";
import type { NodeProps } from "reactflow";

interface TransformNodeData {
    label?: string;
    mode?: string;
    operation?: string;
    inputData?: string;
    expression?: string;
    outputVariable?: string;
}

function TransformNode({ data, selected }: NodeProps<TransformNodeData>) {
    const label = data.label || "Transform";
    const mode = data.mode || "javascript";

    let preview = "No expression";
    if (data.expression) {
        try {
            preview =
                data.expression.length > 80 ? data.expression.slice(0, 80) + "…" : data.expression;
        } catch {
            preview = "Invalid expression";
        }
    }

    return (
        <BaseNode
            icon={Wand2}
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

                {data.operation && (
                    <div className="text-muted-foreground text-[11px]">
                        Operation: <span className="font-medium">{data.operation}</span>
                    </div>
                )}

                <div className="mt-1 border border-border rounded bg-muted/40 px-2 py-1.5 max-h-24 overflow-auto">
                    <div className="text-[10px] text-muted-foreground mb-1">Expression</div>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                        {preview}
                    </pre>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(TransformNode);
