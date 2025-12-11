import { Clock } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "../../BaseNode";

interface WaitNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    duration?: number;
    unit?: string;
}

function WaitNode({ data, selected }: NodeProps<WaitNodeData>) {
    const duration = data.duration || 5;
    const unit = data.unit || "seconds";

    return (
        <BaseNode
            icon={Clock}
            label={data.label || "Wait/Delay"}
            status={data.status}
            category="tools"
            subcategory="flow-control"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Duration:</span>
                    <span className="text-xs font-medium">
                        {duration} {unit}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(WaitNode);
