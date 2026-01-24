import { GitFork } from "lucide-react";
import { memo, useEffect } from "react";
import { NodeProps, Handle, Position, useNodeId, useUpdateNodeInternals } from "reactflow";
import { useWorkflowStore } from "../../stores/workflowStore";
import { BaseNode, ConnectorLayout } from "./BaseNode";

interface RouterNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    model?: string;
    prompt?: string;
    routes?: Array<{ value: string; label?: string; description?: string }>;
}

function RouterNode({ data, selected }: NodeProps<RouterNodeData>) {
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
    }, [connectorLayout, nodeId, updateNodeInternals, data.routes]);

    const provider = data.provider || "OpenAI";
    const model = data.model || "gpt-4";
    const routeCount = data.routes?.length || 2;
    const promptPreview = data.prompt
        ? data.prompt.substring(0, 40) + (data.prompt.length > 40 ? "..." : "")
        : "No prompt configured";

    const isHorizontal = connectorLayout === "horizontal";
    const inputPosition = isHorizontal ? Position.Left : Position.Top;
    const outputPosition = isHorizontal ? Position.Right : Position.Bottom;

    return (
        <BaseNode
            icon={GitFork}
            label={data.label || "Router"}
            status={data.status}
            category="ai"
            selected={selected}
            hasOutputHandle={false}
            customHandles={
                <>
                    <Handle
                        type="target"
                        position={inputPosition}
                        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                    />
                    {(data.routes || []).slice(0, 5).map((route, i) => (
                        <Handle
                            key={route.value}
                            type="source"
                            position={outputPosition}
                            id={route.value}
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                            style={
                                isHorizontal
                                    ? { top: `${30 + i * 14}%` }
                                    : { left: `${25 + i * 14}%` }
                            }
                        />
                    ))}
                </>
            }
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Provider:</span>
                    <span className="text-xs font-medium capitalize">{provider}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-xs font-medium">{model}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Routes:</span>
                    <span className="text-xs font-medium">{routeCount}</span>
                </div>
                <div className="pt-1.5 mt-1 border-t border-border">
                    <div className="text-xs text-muted-foreground italic line-clamp-1">
                        {promptPreview}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(RouterNode);
