import { Video } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface VideoGenerationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    model?: string;
}

function VideoGenerationNode({ data, selected }: NodeProps<VideoGenerationNodeData>) {
    const provider = data.provider || "runway";
    const model = data.model || "gen3a_turbo";

    return (
        <BaseNode
            icon={Video}
            label={data.label || "Video"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Provider:</span>
                    <span className="text-xs font-medium capitalize">{provider}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-xs font-medium">{model}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(VideoGenerationNode);
