import { Image } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface ImageGenerationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    model?: string;
}

function ImageGenerationNode({ data, selected }: NodeProps<ImageGenerationNodeData>) {
    const provider = data.provider || "openai";
    const model = data.model || "dall-e-3";

    return (
        <BaseNode
            icon={Image}
            label={data.label || "Image"}
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

export default memo(ImageGenerationNode);
