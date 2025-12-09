import { ArrowDownToLine } from "lucide-react";
import { memo } from "react";
import { BaseNode } from "./BaseNode";
import type { NodeStatus } from "./BaseNode";
import type { NodeProps } from "reactflow";

interface InputNodeData {
    label?: string;
    status?: NodeStatus;
    inputType?: "manual" | "json" | "csv" | "form";
    description?: string;
    sampleData?: unknown;
    requiredFields?: string[];
}

function InputNode({ data, selected }: NodeProps<InputNodeData>) {
    const label = data.label || "Input";
    const inputType = data.inputType || "manual";

    let samplePreview = "No sample data configured";
    if (data.sampleData !== undefined && data.sampleData !== null) {
        try {
            samplePreview = JSON.stringify(data.sampleData, null, 2);
        } catch {
            samplePreview = String(data.sampleData);
        }
    }

    return (
        <BaseNode
            icon={ArrowDownToLine}
            label={label}
            status={data.status}
            category="tools"
            subcategory="flow-control"
            selected={selected}
        >
            <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Input type</span>
                    <span className="font-medium">{inputType}</span>
                </div>

                {data.description && (
                    <div className="text-muted-foreground text-[11px]">{data.description}</div>
                )}

                {Array.isArray(data.requiredFields) && data.requiredFields.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                        Required fields:{" "}
                        <span className="font-medium">{data.requiredFields.join(", ")}</span>
                    </div>
                )}

                <div className="mt-1 border border-border rounded bg-muted/40 px-2 py-1.5 max-h-24 overflow-auto">
                    <div className="text-[10px] text-muted-foreground mb-1">Sample data</div>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                        {samplePreview}
                    </pre>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(InputNode);
