import { Hand } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface InputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    inputType?: string;
    inputName?: string;
    required?: boolean;
}

function InputNode({ data, selected }: NodeProps<InputNodeData>) {
    const inputType = data.inputType || "text";
    const inputName = data.inputName || "input";

    return (
        <BaseNode
            icon={Hand}
            label={data.label || "Input"}
            status={data.status}
            category="data"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium capitalize text-foreground">
                        {inputType}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Variable:</span>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                        ${inputName}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(InputNode);
