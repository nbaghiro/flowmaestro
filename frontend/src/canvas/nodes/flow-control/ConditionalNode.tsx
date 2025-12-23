import { GitBranch, CheckCircle2, XCircle } from "lucide-react";
import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { BaseNode } from "../BaseNode";

interface ConditionalNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    mode?: "boolean" | "router";

    // boolean
    conditionType?: "simple" | "expression";
    leftValue?: string;
    operator?: string;
    rightValue?: string;
    expression?: string;

    // router
    conditions?: {
        name: string;
        expression: string;
        description?: string;
    }[];
    defaultOutput?: string;
    evaluationMode?: "first" | "all";
}

function ConditionalNode({ data, selected }: NodeProps<ConditionalNodeData>) {
    const conditionType = data.conditionType || "simple";
    const leftValue = data.leftValue || "";
    const operator = data.operator || "==";
    const rightValue = data.rightValue || "";
    const expression = data.expression || "";

    const mode = data.mode ?? "boolean";

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

    const conditions = Array.isArray(data.conditions)
        ? data.conditions.map((cond, index) => ({
              name: cond?.name?.trim() || `route-${index + 1}`,
              expression: cond?.expression?.trim() || "",
              description: cond?.description || ""
          }))
        : [];

    const defaultOutputLabel = data.defaultOutput?.trim() || "default";

    const seen = new Set<string>();
    const outputs = conditions.map((cond, index) => {
        const base =
            cond.name
                ?.trim()
                .replace(/[^a-zA-Z0-9_-]/g, "-")
                .replace(/-+/g, "-") || `route-${index + 1}`;
        let candidate = base;
        let counter = 1;
        while (seen.has(candidate)) {
            candidate = `${base}-${counter++}`;
        }
        seen.add(candidate);

        return {
            id: candidate,
            label: cond.name || `Route ${index + 1}`,
            expression: cond.expression || "Add expression"
        };
    });

    const customHandles =
        mode === "router" ? (
            <>
                {/* Input */}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-2.5 !h-2.5 !bg-card !border-2 !border-primary !shadow-sm"
                />

                {outputs.map((output, index) => {
                    const left = `${(index + 1) * (100 / (outputs.length + 1))}%`;

                    return (
                        <Handle
                            key={output.id}
                            type="source"
                            position={Position.Bottom}
                            id={output.id}
                            className="!w-2.5 !h-2.5 !bg-card !border-2 !border-border !shadow-sm"
                            style={{ left }}
                        />
                    );
                })}
            </>
        ) : (
            <>
                {/* Input */}
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-2.5 !h-2.5 !bg-card !border-2 !border-primary !shadow-sm"
                />

                {/* True */}
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="true"
                    className="!w-2.5 !h-2.5 !bg-card !border-2 !border-green-500 !shadow-sm"
                    style={{ left: "35%" }}
                />

                {/* False */}
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="false"
                    className="!w-2.5 !h-2.5 !bg-card !border-2 !border-red-500 !shadow-sm"
                    style={{ left: "65%" }}
                />
            </>
        );
    return (
        <BaseNode
            icon={GitBranch}
            label={data.label || "Conditional"}
            status={data.status}
            category="tools"
            subcategory="flow-control"
            selected={selected}
            hasOutputHandle={false}
            customHandles={customHandles}
        >
            {mode === "router" ? (
                <div className="flex flex-col gap-2 text-xs h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mode</span>
                        <span className="font-medium capitalize">
                            {data.evaluationMode ?? "first"} match
                        </span>
                    </div>

                    {outputs.length === 0 ? (
                        <div className="text-muted-foreground">
                            No conditions set. Falls back to{" "}
                            <span className="font-mono text-foreground">{defaultOutputLabel}</span>.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {outputs.slice(0, 3).map((out, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border whitespace-nowrap">
                                        {out.label}
                                    </span>
                                    <span className="flex-1 text-[11px] font-mono bg-muted px-2 py-1 rounded border border-border line-clamp-2">
                                        {out.expression}
                                    </span>
                                </div>
                            ))}

                            {outputs.length > 3 && (
                                <div className="text-[11px] text-muted-foreground">
                                    +{outputs.length - 3} more
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-[11px] text-muted-foreground">
                        Default route:{" "}
                        <span className="font-mono text-foreground">{defaultOutputLabel}</span>
                    </div>
                </div>
            ) : (
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
            )}
        </BaseNode>
    );
}

export default memo(ConditionalNode);
