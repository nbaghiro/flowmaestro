import { Plug } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface IntegrationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    operation?: string;
}

function IntegrationNode({ data, selected }: NodeProps<IntegrationNodeData>) {
    const provider = data.provider;
    const operation = data.operation;

    // Format operation for display: handle both snake_case and camelCase
    const formatOperation = (opStr: string): string => {
        // Replace underscores with spaces
        let formatted = opStr.replace(/_/g, " ");
        // Add spaces before capital letters (camelCase to space case)
        formatted = formatted.replace(/([A-Z])/g, " $1");
        // Capitalize first letter and trim
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
    };

    return (
        <BaseNode
            icon={Plug}
            label={data.label || "Integration"}
            status={data.status}
            category="integration"
            subcategory="productivity"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Provider:</span>
                    <span className="text-xs font-medium capitalize">{provider || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Operation:</span>
                    <span className="text-xs font-medium">
                        {operation ? formatOperation(operation) : "—"}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(IntegrationNode);
