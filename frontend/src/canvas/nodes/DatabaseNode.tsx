import { Database } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface DatabaseNodeData {
    label: string;
    status?: NodeExecutionStatus;
    operation?: string;
    provider?: string;
}

function DatabaseNode({ data, selected }: NodeProps<DatabaseNodeData>) {
    const provider = data.provider;
    const operation = data.operation;

    // Format provider name for display (PostgreSQL, MySQL, MongoDB)
    const formatProvider = (providerStr: string): string => {
        const providerMap: Record<string, string> = {
            postgresql: "PostgreSQL",
            mysql: "MySQL",
            mongodb: "MongoDB"
        };
        return providerMap[providerStr.toLowerCase()] || providerStr;
    };

    // Format operation for display
    const formatOperation = (opStr: string): string => {
        // Replace underscores with spaces
        const formatted = opStr.replace(/_/g, " ");
        // Capitalize first letter
        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    };

    return (
        <BaseNode
            icon={Database}
            label={data.label || "Database"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium">
                        {provider ? formatProvider(provider) : "—"}
                    </span>
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

export default memo(DatabaseNode);
