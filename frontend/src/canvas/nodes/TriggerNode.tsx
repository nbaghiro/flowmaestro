import { Zap } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface TriggerNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    triggerType?: "schedule" | "webhook" | "manual" | "event";
    enabled?: boolean;
    cronExpression?: string;
    nextScheduledAt?: string;
    webhookUrl?: string;
}

function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
    const triggerType = data.triggerType || "manual";
    const enabled = data.enabled ?? true;

    const getTypeLabel = () => {
        switch (triggerType) {
            case "schedule":
                return "Schedule";
            case "webhook":
                return "Webhook";
            case "event":
                return "Event";
            default:
                return "Manual";
        }
    };

    const formatNextRun = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatWebhookUrl = (url?: string) => {
        if (!url) return null;
        // Show just the last part of the URL
        const parts = url.split("/");
        return `.../${parts.slice(-2).join("/")}`;
    };

    return (
        <BaseNode
            icon={Zap}
            label={data.label || "Trigger"}
            status={data.status}
            category="inputs"
            selected={selected}
            hasInputHandle={false}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium">{getTypeLabel()}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <span
                        className={`text-xs font-medium ${enabled ? "text-green-600" : "text-muted-foreground"}`}
                    >
                        {enabled ? "Enabled" : "Disabled"}
                    </span>
                </div>

                {triggerType === "schedule" && data.cronExpression && (
                    <div className="pt-1.5 mt-1 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                            <span className="font-mono">{data.cronExpression}</span>
                        </div>
                        {data.nextScheduledAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                                Next: {formatNextRun(data.nextScheduledAt)}
                            </div>
                        )}
                    </div>
                )}

                {triggerType === "webhook" && data.webhookUrl && (
                    <div className="pt-1.5 mt-1 border-t border-border">
                        <div className="text-xs text-muted-foreground font-mono truncate">
                            {formatWebhookUrl(data.webhookUrl)}
                        </div>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(TriggerNode);
