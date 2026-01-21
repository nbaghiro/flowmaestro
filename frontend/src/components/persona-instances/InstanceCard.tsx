import { Clock, DollarSign, AlertCircle, CheckCircle, XCircle, Loader2, Play } from "lucide-react";
import React from "react";
import type { PersonaInstanceSummary, PersonaCategory } from "../../lib/api";

interface InstanceCardProps {
    instance: PersonaInstanceSummary;
    onClick: () => void;
    onApprove?: () => void;
    onDeny?: () => void;
    onCancel?: () => void;
}

const categoryIcons: Record<PersonaCategory, string> = {
    research: "🔍",
    content: "✍️",
    development: "💻",
    data: "📊",
    operations: "⚙️",
    business: "📈"
};

const statusConfig: Record<
    string,
    {
        label: string;
        color: string;
        bgColor: string;
        icon: React.ReactNode;
    }
> = {
    initializing: {
        label: "Initializing",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        icon: <Loader2 className="w-3 h-3 animate-spin" />
    },
    clarifying: {
        label: "Clarifying",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        icon: <Loader2 className="w-3 h-3 animate-spin" />
    },
    running: {
        label: "Running",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        icon: <Play className="w-3 h-3" />
    },
    waiting_approval: {
        label: "Needs Approval",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        icon: <AlertCircle className="w-3 h-3" />
    },
    completed: {
        label: "Completed",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
        icon: <CheckCircle className="w-3 h-3" />
    },
    cancelled: {
        label: "Cancelled",
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-900/30",
        icon: <XCircle className="w-3 h-3" />
    },
    failed: {
        label: "Failed",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
        icon: <XCircle className="w-3 h-3" />
    },
    timeout: {
        label: "Timed Out",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-900/30",
        icon: <Clock className="w-3 h-3" />
    }
};

function formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return "0m";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function formatTimeAgo(date: string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
    instance,
    onClick,
    onApprove,
    onDeny,
    onCancel
}) => {
    const status = statusConfig[instance.status] || statusConfig.running;
    const isActive = ["initializing", "clarifying", "running", "waiting_approval"].includes(
        instance.status
    );

    const handleApproveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onApprove?.();
    };

    const handleDenyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeny?.();
    };

    const handleCancelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCancel?.();
    };

    return (
        <div
            className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl flex-shrink-0">
                    {instance.persona?.avatar_url ? (
                        <img
                            src={instance.persona.avatar_url}
                            alt={instance.persona.name}
                            className="w-8 h-8 rounded-full"
                        />
                    ) : instance.persona?.category ? (
                        categoryIcons[instance.persona.category]
                    ) : (
                        "🤖"
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                            {instance.persona?.name || "Unknown Persona"}
                        </h3>
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
                        >
                            {status.icon}
                            {status.label}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {instance.task_title || instance.task_description}
                    </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(instance.updated_at)}
                </span>
            </div>

            {/* Progress bar for active instances */}
            {isActive && instance.iteration_count > 0 && (
                <div className="mb-3">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{
                                width: `${Math.min(100, (instance.iteration_count / 100) * 100)}%`
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Metrics */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDuration(instance.duration_seconds)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{Math.round(instance.accumulated_cost_credits || 0)} credits</span>
                </div>
            </div>

            {/* Actions */}
            {instance.status === "waiting_approval" && (onApprove || onDeny) && (
                <div className="flex gap-2">
                    {onApprove && (
                        <button
                            onClick={handleApproveClick}
                            className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Approve
                        </button>
                    )}
                    {onDeny && (
                        <button
                            onClick={handleDenyClick}
                            className="flex-1 px-3 py-1.5 border border-border rounded text-sm font-medium hover:bg-muted transition-colors"
                        >
                            Deny
                        </button>
                    )}
                </div>
            )}

            {isActive && instance.status !== "waiting_approval" && onCancel && (
                <button
                    onClick={handleCancelClick}
                    className="w-full px-3 py-1.5 border border-border rounded text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                    Cancel
                </button>
            )}
        </div>
    );
};
