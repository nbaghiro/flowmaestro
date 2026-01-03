import { Play } from "lucide-react";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface ActionNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    providerName?: string;
    operation?: string;
    operationName?: string;
}

function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
    const [imageError, setImageError] = useState(false);

    const hasProvider = data.provider && (data.providerName || data.provider);
    const hasOperation = data.operation && (data.operationName || data.operation);

    // Get provider info for display name and logo
    const providerInfo = data.provider
        ? ALL_PROVIDERS.find((p) => p.provider === data.provider)
        : null;
    const logoUrl = providerInfo?.logoUrl;

    // Display names
    const providerDisplayName = data.providerName || providerInfo?.displayName || data.provider;
    const operationDisplayName = data.operationName || formatOperation(data.operation || "");

    // Format operation for display: handle both snake_case and camelCase
    function formatOperation(opStr: string): string {
        // Replace underscores with spaces
        let formatted = opStr.replace(/_/g, " ");
        // Add spaces before capital letters (camelCase to space case)
        formatted = formatted.replace(/([A-Z])/g, " $1");
        // Capitalize first letter and trim
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
    }

    // Generate node label
    const nodeLabel =
        hasProvider && hasOperation
            ? `${providerDisplayName} ${operationDisplayName}`
            : data.label || "Action";

    return (
        <BaseNode
            icon={Play}
            label={nodeLabel}
            status={data.status}
            category="outputs"
            selected={selected}
        >
            <div className="space-y-1.5">
                {hasProvider ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Provider:</span>
                            <div className="flex items-center gap-1.5">
                                {logoUrl && !imageError && (
                                    <div className="w-4 h-4 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                        <img
                                            src={logoUrl}
                                            alt={providerDisplayName}
                                            className="w-3 h-3 object-contain"
                                            onError={() => setImageError(true)}
                                        />
                                    </div>
                                )}
                                <span className="text-xs font-medium">{providerDisplayName}</span>
                            </div>
                        </div>
                        {hasOperation && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Action:</span>
                                <span className="text-xs font-medium">{operationDisplayName}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-xs text-muted-foreground">Select an integration...</div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(ActionNode);
