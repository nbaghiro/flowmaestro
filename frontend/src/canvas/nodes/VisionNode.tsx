import { Eye } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface VisionNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    operation?: string;
    model?: string;
}

function VisionNode({ data, selected }: NodeProps<VisionNodeData>) {
    const operation = data.operation || "analyze";
    const model = data.model || "gpt-4-vision";

    return (
        <BaseNode
            icon={Eye}
            label={data.label || "Vision"}
            status={data.status}
            category="ai"
            subcategory="vision-media"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Operation:</span>
                    <span className="text-xs font-medium capitalize">{operation}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-xs font-medium">{model}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(VisionNode);
