import { GitMerge } from "lucide-react";
import { memo, useEffect } from "react";
import { NodeProps, Handle, Position, useNodeId, useUpdateNodeInternals } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { useWorkflowStore } from "../../stores/workflowStore";
import { BaseNode, ConnectorLayout } from "./BaseNode";

interface SwitchNodeData {
    label: string;
    status?: NodeExecutionStatus;
    variable?: string;
    cases?: Array<{ value: string; label: string }>;
}

function SwitchNode({ data, selected }: NodeProps<SwitchNodeData>) {
    const nodeId = useNodeId();
    const updateNodeInternals = useUpdateNodeInternals();

    const connectorLayout = useWorkflowStore((s) => {
        if (!nodeId) return "horizontal";
        const node = s.nodes.find((item) => item.id === nodeId);
        return (node?.data?.connectorLayout as ConnectorLayout) || "horizontal";
    });

    useEffect(() => {
        if (nodeId) {
            updateNodeInternals(nodeId);
        }
    }, [connectorLayout, nodeId, updateNodeInternals, data.cases]);

    const variable = data.variable || "${value}";
    // Use configured cases or create default placeholder cases for handle positioning
    const cases =
        data.cases && data.cases.length > 0
            ? data.cases.slice(0, 4)
            : [
                  { value: "", label: "Case 1" },
                  { value: "", label: "Case 2" },
                  { value: "", label: "Case 3" }
              ];
    const caseCount = data.cases?.length || cases.length;

    const isHorizontal = connectorLayout === "horizontal";
    const inputPosition = isHorizontal ? Position.Left : Position.Top;
    const outputPosition = isHorizontal ? Position.Right : Position.Bottom;

    return (
        <BaseNode
            icon={GitMerge}
            label={data.label || "Switch"}
            status={data.status}
            category="logic"
            selected={selected}
            hasOutputHandle={false}
            customHandles={
                <>
                    <Handle
                        type="target"
                        position={inputPosition}
                        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                    />
                    {cases.map((caseItem, i) => (
                        <Handle
                            key={caseItem.value || `case-${i}`}
                            type="source"
                            position={outputPosition}
                            id={caseItem.value || `case-${i}`}
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                            style={
                                isHorizontal
                                    ? { top: `${30 + i * 17}%` }
                                    : { left: `${25 + i * 17}%` }
                            }
                        />
                    ))}
                    {/* Backward compatibility: hidden handles for legacy case-N format edges */}
                    {cases.map((caseItem, i) => {
                        // Only create legacy handle if value exists (otherwise the primary already uses case-N)
                        if (!caseItem.value) return null;
                        return (
                            <Handle
                                key={`legacy-case-${i}`}
                                type="source"
                                position={outputPosition}
                                id={`case-${i}`}
                                className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm !opacity-0 !pointer-events-none"
                                style={
                                    isHorizontal
                                        ? { top: `${30 + i * 17}%` }
                                        : { left: `${25 + i * 17}%` }
                                }
                            />
                        );
                    })}
                </>
            }
        >
            <div className="flex flex-col h-full justify-between">
                <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border truncate">
                    {variable}
                </div>
                <div className="text-xs text-muted-foreground">
                    {caseCount} case{caseCount !== 1 ? "s" : ""}
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(SwitchNode);
