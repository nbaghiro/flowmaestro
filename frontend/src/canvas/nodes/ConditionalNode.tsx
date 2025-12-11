import { GitBranch, CheckCircle2, XCircle } from "lucide-react";
import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { BaseNode } from "./BaseNode";

interface ConditionalNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    conditionType?: "simple" | "expression";
    leftValue?: string;
    operator?: string;
    rightValue?: string;
    expression?: string;
}

function ConditionalNode({ data, selected }: NodeProps<ConditionalNodeData>) {
    const conditionType = data.conditionType || "simple";
    const leftValue = data.leftValue || "";
    const operator = data.operator || "==";
    const rightValue = data.rightValue || "";
    const expression = data.expression || "";

    const renderCondition = () => {
        if (conditionType === "expression" && expression) {
            return (
                <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border line-clamp-2">
                    {expression}
                </div>
            );
        }

        // Simple comparison
        const displayLeft = leftValue || "value1";
        const displayRight = rightValue || "value2";

        return (
            <div className="flex items-center gap-2 text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border">
                <span className="break-words">{displayLeft}</span>
                <span className="text-primary font-semibold whitespace-nowrap">{operator}</span>
                <span className="flex-1 break-words overflow-hidden overflow-hidden whitespace-nowrap text-ellipsis">
                    {displayRight}
                </span>
            </div>
        );
    };

    return (
        <BaseNode
            icon={GitBranch}
            label={data.label || "Conditional"}
            status={data.status}
            category="tools"
            subcategory="flow-control"
            selected={selected}
            hasOutputHandle={false}
            customHandles={
                <>
                    {/* Input Handle */}
                    <Handle
                        type="target"
                        position={Position.Top}
                        className="!w-2.5 !h-2.5 !bg-card !border-2 !border-primary !shadow-sm"
                    />

                    {/* True Output Handle */}
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="true"
                        className="!w-2.5 !h-2.5 !bg-card !border-2 !border-green-500 !shadow-sm"
                        style={{ left: "35%" }}
                    />

                    {/* False Output Handle */}
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="false"
                        className="!w-2.5 !h-2.5 !bg-card !border-2 !border-red-500 !shadow-sm"
                        style={{ left: "65%" }}
                    />
                </>
            }
        >
            <div className="flex flex-col h-full">
                <div className="flex-1 overflow-auto">{renderCondition()}</div>

                <div className="flex justify-between text-xs pt-1">
                    <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="font-medium">True</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-3 h-3" />
                        <span className="font-medium">False</span>
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(ConditionalNode);
