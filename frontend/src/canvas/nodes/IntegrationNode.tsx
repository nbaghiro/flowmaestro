import { Plug } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface IntegrationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    operation?: string;
}

function IntegrationNode({ data, selected }: NodeProps<IntegrationNodeData>) {
    const provider = data.provider?.toLocaleLowerCase();
    const operation = data.operation;

    const providerMeta = ALL_PROVIDERS.find((p) => p.provider === provider);

    const providerLogoUrl = providerMeta?.logoUrl;
    const providerBorderColor = providerMeta?.brandColor;
    const ProviderLogo = ({ className }: { className?: string }) => (
        <img
            src={providerLogoUrl}
            alt={providerMeta?.displayName || "Provider logo"}
            className={`${className ?? ""} object-contain`}
        />
    );

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
            icon={providerLogoUrl ? ProviderLogo : Plug}
            iconClassName={providerLogoUrl ? "w-5 h-5 rounded" : undefined}
            iconWrapperClassName={providerLogoUrl ? "p-1 w-7 h-7 border bg-muted/30" : undefined}
            iconWrapperStyle={
                providerLogoUrl && providerBorderColor
                    ? { borderColor: providerBorderColor }
                    : undefined
            }
            label={data.label || "Integration"}
            status={data.status}
            category="connect"
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
