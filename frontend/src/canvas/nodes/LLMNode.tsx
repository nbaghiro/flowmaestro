import { Bot } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface LLMNodeData {
    label: string;
    status?: NodeExecutionStatus;
    provider?: string;
    model?: string;
    prompt?: string;
}

function LLMNode({ data, selected }: NodeProps<LLMNodeData>) {
    const provider = data.provider || "OpenAI";
    const model = data.model || "gpt-4";
    const promptPreview = data.prompt
        ? data.prompt.substring(0, 50) + (data.prompt.length > 50 ? "..." : "")
        : "No prompt configured";

    return (
        <BaseNode
            icon={Bot}
            label={data.label || "LLM"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Provider:</span>
                    <span className="text-xs font-medium">{provider}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-xs font-medium">{model}</span>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-border">
                    <div className="text-xs text-muted-foreground italic line-clamp-2">
                        {promptPreview}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(LLMNode);
