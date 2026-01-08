/**
 * History Tab Component
 * Displays past executions for the current workflow
 */

import {
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    RotateCcw,
    ChevronRight,
    PauseCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { getExecutions, Execution } from "../../lib/api";
import { logger } from "../../lib/logger";
import { cn } from "../../lib/utils";

interface HistoryTabProps {
    workflowId: string;
}

export function HistoryTab({ workflowId }: HistoryTabProps) {
    const [executions, setExecutions] = useState<Execution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);

    useEffect(() => {
        loadExecutions();
    }, [workflowId]);

    const loadExecutions = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getExecutions(workflowId, { limit: 50 });
            if (response.success) {
                setExecutions(response.data.items);
            }
        } catch (err) {
            logger.error("Failed to load executions", err);
            setError(err instanceof Error ? err.message : "Failed to load execution history");
        } finally {
            setLoading(false);
        }
    };

    // Get status icon and color
    const getStatusInfo = (status: Execution["status"]) => {
        switch (status) {
            case "pending":
                return {
                    icon: <Clock className="w-4 h-4" />,
                    color: "text-yellow-500",
                    bg: "bg-yellow-50 dark:bg-yellow-900/20",
                    label: "Pending"
                };
            case "running":
                return {
                    icon: <Clock className="w-4 h-4 animate-spin" />,
                    color: "text-blue-500",
                    bg: "bg-blue-50 dark:bg-blue-900/20",
                    label: "Running"
                };
            case "completed":
                return {
                    icon: <CheckCircle2 className="w-4 h-4" />,
                    color: "text-green-500",
                    bg: "bg-green-50 dark:bg-green-900/20",
                    label: "Completed"
                };
            case "failed":
                return {
                    icon: <XCircle className="w-4 h-4" />,
                    color: "text-red-500",
                    bg: "bg-red-50 dark:bg-red-900/20",
                    label: "Failed"
                };
            case "paused":
                return {
                    icon: <PauseCircle className="w-4 h-4" />,
                    color: "text-amber-500",
                    bg: "bg-amber-50 dark:bg-amber-900/20",
                    label: "Paused"
                };
            case "cancelled":
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    color: "text-gray-500",
                    bg: "bg-muted/30 dark:bg-gray-900/20",
                    label: "Cancelled"
                };
            default:
                return {
                    icon: <Clock className="w-4 h-4" />,
                    color: "text-gray-500",
                    bg: "bg-muted/30 dark:bg-gray-900/20",
                    label: status
                };
        }
    };

    // Format duration
    const formatDuration = (started: string | null, completed: string | null) => {
        if (!started) return "N/A";
        if (!completed) return "In progress";

        const start = new Date(started).getTime();
        const end = new Date(completed).getTime();
        const ms = end - start;

        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    // Loading state
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <RotateCcw className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading execution history...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center px-8">
                    <XCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                    <h4 className="font-medium mb-2">Failed to Load History</h4>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <button
                        onClick={loadExecutions}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (executions.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="font-medium mb-2">No Execution History</h4>
                <p className="text-sm text-muted-foreground">
                    Past workflow executions will appear here
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
                <h5 className="text-sm font-medium">
                    {executions.length} execution{executions.length !== 1 ? "s" : ""}
                </h5>
                <button
                    onClick={loadExecutions}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="Refresh"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Execution List */}
            <div className="flex-1 overflow-hidden flex">
                {/* List */}
                <div
                    className={cn(
                        "flex-shrink-0 overflow-y-auto border-r border-border",
                        selectedExecution ? "w-64" : "flex-1"
                    )}
                >
                    <div className="p-2 space-y-1">
                        {executions.map((execution) => {
                            const statusInfo = getStatusInfo(execution.status);
                            const isSelected = selectedExecution?.id === execution.id;

                            return (
                                <button
                                    key={execution.id}
                                    onClick={() =>
                                        setSelectedExecution(isSelected ? null : execution)
                                    }
                                    className={cn(
                                        "w-full p-3 rounded-lg border text-left transition-colors",
                                        isSelected
                                            ? "bg-primary/10 border-primary"
                                            : "bg-background border-border hover:bg-muted/50"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={statusInfo.color}>
                                                {statusInfo.icon}
                                            </div>
                                            <span className="text-xs font-medium">
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDuration(
                                                execution.started_at,
                                                execution.completed_at
                                            )}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono truncate">
                                                {execution.id.substring(0, 8)}...
                                            </span>
                                            {!isSelected && selectedExecution && (
                                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                            )}
                                        </div>
                                        <div>{new Date(execution.created_at).toLocaleString()}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Details Panel */}
                {selectedExecution && (
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            {/* Header */}
                            <div>
                                <h4 className="font-semibold mb-1">Execution Details</h4>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {selectedExecution.id}
                                </p>
                            </div>

                            {/* Status */}
                            <div>
                                <h5 className="text-sm font-medium mb-2">Status</h5>
                                <div
                                    className={cn(
                                        "p-3 rounded-lg flex items-center gap-2",
                                        getStatusInfo(selectedExecution.status).bg
                                    )}
                                >
                                    <div className={getStatusInfo(selectedExecution.status).color}>
                                        {getStatusInfo(selectedExecution.status).icon}
                                    </div>
                                    <span className="font-medium">
                                        {getStatusInfo(selectedExecution.status).label}
                                    </span>
                                </div>
                            </div>

                            {/* Times */}
                            <div>
                                <h5 className="text-sm font-medium mb-2">Timeline</h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Created:</span>
                                        <span>
                                            {new Date(
                                                selectedExecution.created_at
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    {selectedExecution.started_at && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Started:</span>
                                            <span>
                                                {new Date(
                                                    selectedExecution.started_at
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {selectedExecution.completed_at && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                Completed:
                                            </span>
                                            <span>
                                                {new Date(
                                                    selectedExecution.completed_at
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-medium">
                                        <span className="text-muted-foreground">Duration:</span>
                                        <span>
                                            {formatDuration(
                                                selectedExecution.started_at,
                                                selectedExecution.completed_at
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {selectedExecution.error && (
                                <div>
                                    <h5 className="text-sm font-medium mb-2 text-red-500">Error</h5>
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                        <pre className="text-xs text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono">
                                            {selectedExecution.error}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Inputs */}
                            {selectedExecution.inputs &&
                                Object.keys(selectedExecution.inputs).length > 0 && (
                                    <div>
                                        <h5 className="text-sm font-medium mb-2">Inputs</h5>
                                        <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                                            <pre className="text-xs font-mono whitespace-pre-wrap">
                                                {JSON.stringify(selectedExecution.inputs, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                            {/* Outputs */}
                            {selectedExecution.outputs &&
                                Object.keys(selectedExecution.outputs).length > 0 && (
                                    <div>
                                        <h5 className="text-sm font-medium mb-2">Outputs</h5>
                                        <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                                            <pre className="text-xs font-mono whitespace-pre-wrap">
                                                {JSON.stringify(selectedExecution.outputs, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
