import { Bot } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface LLMNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    provider?: string;
    model?: string;
    prompt?: string;
}

function LLMNode({ data, selected }: NodeProps<LLMNodeData>) {
    const provider = data.provider?.toLocaleLowerCase();
    const model = data.model || "gpt-4";
    const promptPreview = data.prompt
        ? data.prompt.substring(0, 50) + (data.prompt.length > 50 ? "..." : "")
        : "No prompt configured";

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

    return (
        <BaseNode
            icon={providerLogoUrl ? ProviderLogo : Bot}
            iconClassName={providerLogoUrl ? "w-5 h-5 rounded" : undefined}
            iconWrapperClassName={providerLogoUrl ? "p-1 w-7 h-7 border bg-muted/30" : undefined}
            iconWrapperStyle={
                providerLogoUrl && providerBorderColor
                    ? { borderColor: providerBorderColor }
                    : undefined
            }
            label={data.label || "LLM"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Provider:</span>
                    <span className="text-xs font-medium">
                        {providerMeta?.displayName || data.provider || "Unknown"}
                    </span>
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
