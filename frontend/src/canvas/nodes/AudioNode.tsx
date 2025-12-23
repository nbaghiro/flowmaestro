import { Mic } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface AudioNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    operation?: string;
    model?: string;
}

function AudioNode({ data, selected }: NodeProps<AudioNodeData>) {
    const operation = data.operation || "transcribe";
    const model = data.model || "whisper-1";

    return (
        <BaseNode
            icon={Mic}
            label={data.label || "Audio"}
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

export default memo(AudioNode);
