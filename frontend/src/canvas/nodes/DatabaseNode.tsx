import { Database } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface DatabaseNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    operation?: string;
    provider?: string;
}

function DatabaseNode({ data, selected }: NodeProps<DatabaseNodeData>) {
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
            icon={providerLogoUrl ? ProviderLogo : Database}
            iconClassName={providerLogoUrl ? "w-5 h-5 rounded" : undefined}
            iconWrapperClassName={providerLogoUrl ? "p-1 w-7 h-7 border bg-muted/30" : undefined}
            iconWrapperStyle={
                providerLogoUrl && providerBorderColor
                    ? { borderColor: providerBorderColor }
                    : undefined
            }
            label={data.label || "Database"}
            status={data.status}
            category="connect"
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
