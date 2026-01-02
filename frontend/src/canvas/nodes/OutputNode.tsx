import { Send, FileText } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface OutputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    value?: string;
    format?: string;
}

function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
    const value = data.value || "No output template";
    const format = data.format || "text";
    const valuePreview = value.substring(0, 60) + (value.length > 60 ? "..." : "");

    return (
        <BaseNode
            icon={Send}
            label={data.label || "Output"}
            status={data.status}
            category="outputs"
            selected={selected}
            hasOutputHandle={true}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium uppercase text-foreground">
                            {format}
                        </span>
                    </div>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-border">
                    <div className="text-xs text-muted-foreground italic line-clamp-2">
                        {valuePreview}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(OutputNode);
