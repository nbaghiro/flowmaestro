import { UserCircle } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface WaitForUserNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    prompt?: string;
    variableName?: string;
    inputType?: string;
    required?: boolean;
}

function WaitForUserNode({ data, selected }: NodeProps<WaitForUserNodeData>) {
    const prompt = data.prompt || "Enter your input";
    const variableName = data.variableName || "userInput";
    const inputType = data.inputType || "text";

    return (
        <BaseNode
            icon={UserCircle}
            label={data.label || "Wait for User"}
            status={data.status}
            category="logic"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="text-xs italic text-muted-foreground line-clamp-2">"{prompt}"</div>
                <div className="pt-1.5 mt-1.5 border-t border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Variable:</span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                            ${variableName}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <span className="text-xs font-medium capitalize text-foreground">
                            {inputType}
                        </span>
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(WaitForUserNode);
