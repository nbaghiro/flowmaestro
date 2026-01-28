import { Zap } from "lucide-react";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { getProviderLogo, type NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface TriggerNodeData {
    label: string;
    status?: NodeExecutionStatus;
    providerId?: string;
    providerName?: string;
    eventId?: string;
    eventName?: string;
}

function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
    const [imageError, setImageError] = useState(false);

    const hasProvider = data.providerId && data.providerName;
    const hasEvent = data.eventId && data.eventName;

    // Generate node label: "Provider Event" or just "Trigger"
    const nodeLabel =
        hasProvider && hasEvent
            ? `${data.providerName} ${data.eventName}`
            : data.label || "Trigger";

    return (
        <BaseNode
            icon={Zap}
            label={nodeLabel}
            status={data.status}
            category="inputs"
            selected={selected}
            hasInputHandle={false}
        >
            <div className="space-y-1.5">
                {hasProvider ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Provider:</span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {imageError ? (
                                        <Zap className="w-2.5 h-2.5 text-muted-foreground" />
                                    ) : (
                                        <img
                                            src={getProviderLogo(data.providerId!)}
                                            alt={data.providerName}
                                            className="w-3 h-3 object-contain"
                                            onError={() => setImageError(true)}
                                        />
                                    )}
                                </div>
                                <span className="text-xs font-medium">{data.providerName}</span>
                            </div>
                        </div>
                        {hasEvent && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Event:</span>
                                <span className="text-xs font-medium">{data.eventName}</span>
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

export default memo(TriggerNode);
