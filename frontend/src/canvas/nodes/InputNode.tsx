import { Hand } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface InputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    inputType?: string;
    variableName?: string;
}

function InputNode({ data, selected }: NodeProps<InputNodeData>) {
    const inputType = data.inputType || "text";
    const variableName = data.variableName || "userInput";

    return (
        <BaseNode
            icon={Hand}
            label={data.label || "Input"}
            status={data.status}
            category="inputs"
            selected={selected}
            hasInputHandle={false}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium text-foreground capitalize">
                        {inputType}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Variable:</span>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                        ${variableName}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(InputNode);
