import { GitBranch } from "lucide-react";
import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { BaseNode, NodeStatus } from "../../BaseNode";

interface RouterCondition {
    name: string;
    expression: string;
    description?: string;
}

interface RouterOutput {
    id: string;
    label: string;
    expression: string;
    isDefault?: boolean;
}

interface RouterNodeData {
    label?: string;
    status?: NodeStatus;
    conditions?: RouterCondition[];
    defaultOutput?: string;
    evaluationMode?: "first" | "all";
}

function RouterNode({ data, selected }: NodeProps<RouterNodeData>) {
    const conditions = Array.isArray(data?.conditions) ? data.conditions : [];
    const evaluationMode = data?.evaluationMode ?? "first";
    const defaultOutput = data?.defaultOutput?.trim() || "default";

    // Build final outputs list (conditions + default)
    const outputs: RouterOutput[] = [
        ...conditions.map((cond, index) => ({
            id: cond.name?.trim() || `condition-${index + 1}`,
            label: cond.name || `Condition ${index + 1}`,
            expression: cond.expression || "No expression"
        })),
        {
            id: defaultOutput,
            label: defaultOutput,
            expression: "Default route",
            isDefault: true
        }
    ];

    const handleCount = outputs.length;

    const customHandles = (
        <>
            {/* Input handle */}
            <Handle
                type="target"
                position={Position.Top}
                id="input"
                className="!w-2.5 !h-2.5 !bg-card !border-2 !border-primary !shadow-sm"
            />

            {/* Dynamic output handles */}
            {outputs.map((output, index) => {
                const left = ((index + 1) * (100 / (handleCount + 1))).toFixed(1) + "%";

                return (
                    <Handle
                        key={output.id}
                        type="source"
                        position={Position.Bottom}
                        id={output.id}
                        style={{ left }}
                        className={`!w-2.5 !h-2.5 !bg-card !border-2 !shadow-sm ${
                            output.isDefault ? "!border-dashed !border-border" : "!border-border"
                        }`}
                    />
                );
            })}
        </>
    );

    return (
        <BaseNode
            icon={GitBranch}
            label={data?.label || "Router"}
            status={data?.status}
            category="tools"
            subcategory="flow-control"
            selected={selected}
            hasOutputHandle={false}
            customHandles={customHandles}
        >
            <div className="flex flex-col gap-2 text-xs h-full">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mode</span>
                    <span className="font-medium capitalize">{evaluationMode} match</span>
                </div>

                {conditions.length === 0 ? (
                    <div className="text-muted-foreground">
                        No conditions set. Falls back to{" "}
                        <span className="font-mono text-foreground">{defaultOutput}</span>.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {conditions.slice(0, 3).map((cond, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border whitespace-nowrap">
                                    {cond.name || `Cond ${index + 1}`}
                                </span>

                                <span className="flex-1 text-[11px] font-mono bg-muted px-2 py-1 rounded border border-border line-clamp-2">
                                    {cond.expression || "Add expression"}
                                </span>
                            </div>
                        ))}

                        {conditions.length > 3 && (
                            <div className="text-[11px] text-muted-foreground">
                                +{conditions.length - 3} more condition
                                {conditions.length - 3 === 1 ? "" : "s"}
                            </div>
                        )}
                    </div>
                )}

                <div className="text-[11px] text-muted-foreground">
                    Default route:{" "}
                    <span className="font-mono text-foreground">{defaultOutput}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(RouterNode);
