import { Variable } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface VariableNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    operation?: string;
    variableName?: string;
    value?: string;
}

function VariableNode({ data, selected }: NodeProps<VariableNodeData>) {
    const operation = data.operation || "set";
    const variableName = data.variableName || "myVar";
    const value = data.value || "";

    return (
        <BaseNode
            icon={Variable}
            label={data.label || "Variable"}
            status={data.status}
            category="tools"
            subcategory="data-processing"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Operation:</span>
                    <span className="text-xs font-medium capitalize">{operation}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Name:</span>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        ${variableName}
                    </span>
                </div>
                {value && (
                    <div className="text-xs text-muted-foreground italic truncate">{value}</div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(VariableNode);
