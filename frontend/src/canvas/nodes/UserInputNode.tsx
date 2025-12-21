import { Hand } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface UserInputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    prompt?: string;
    variableName?: string;
    validationType?: string;
    required?: boolean;
}

function UserInputNode({ data, selected }: NodeProps<UserInputNodeData>) {
    const prompt = data.prompt || "Enter your input";
    const variableName = data.variableName || "userInput";
    const validationType = data.validationType || "text";

    return (
        <BaseNode
            icon={Hand}
            label={data.label || "User Input"}
            status={data.status}
            category="interaction"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="text-xs italic text-muted-foreground line-clamp-2">"{prompt}"</div>
                <div className="pt-1.5 mt-1.5 border-t border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Variable:</span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {`{{${variableName}}}`}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <span className="text-xs font-medium capitalize">{validationType}</span>
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(UserInputNode);
