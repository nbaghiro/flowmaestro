/**
 * Execution Tab Component
 * Displays real-time execution monitoring with logs, variables, and status
 */

import {
    Play,
    CheckCircle2,
    XCircle,
    Clock,
    StopCircle,
    Filter,
    ChevronDown,
    PauseCircle,
    MessageSquareText
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { submitUserResponse, type ExecutionPauseContext } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useWorkflowStore } from "../../stores/workflowStore";
import { Button } from "../common/Button";
import { Select } from "../common/Select";
import { UserResponseDialog } from "./UserResponseDialog";

interface ExecutionTabProps {
    workflowId: string;
}

type LogLevel = "info" | "debug" | "warn" | "error" | "all";

export function ExecutionTab({ workflowId: _workflowId }: ExecutionTabProps) {
    const { currentExecution, setPauseContext, updateExecutionStatus } = useWorkflowStore();
    const [logLevelFilter, setLogLevelFilter] = useState<LogLevel>("all");
    const [nodeFilter, setNodeFilter] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(false);
    const [showResponseDialog, setShowResponseDialog] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (currentExecution && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [currentExecution?.logs.length]);

    // Auto-open dialog when execution is paused
    useEffect(() => {
        if (currentExecution?.status === "paused" && currentExecution?.pauseContext) {
            setShowResponseDialog(true);
        }
    }, [currentExecution?.status, currentExecution?.pauseContext]);

    // Handle submitting user response
    const handleSubmitResponse = async (
        response: string | number | boolean | Record<string, unknown>
    ) => {
        if (!currentExecution) return;

        await submitUserResponse(currentExecution.id, response);

        // Update local state
        setPauseContext(null);
        updateExecutionStatus("running");
        setShowResponseDialog(false);
    };

    if (!currentExecution) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 text-muted-foreground" />
                </div>
                <h4 className="font-medium mb-2">No Active Execution</h4>
                <p className="text-sm text-muted-foreground">
                    Run a trigger to see live execution details here
                </p>
            </div>
        );
    }

    // Get status icon and color
    const getStatusInfo = () => {
        switch (currentExecution.status) {
            case "running":
                return {
                    icon: <Clock className="w-5 h-5 animate-spin" />,
                    color: "text-blue-500",
                    bg: "bg-blue-50 dark:bg-blue-900/20",
                    border: "border-blue-200 dark:border-blue-800"
                };
            case "paused":
                return {
                    icon: <PauseCircle className="w-5 h-5" />,
                    color: "text-amber-500",
                    bg: "bg-amber-50 dark:bg-amber-900/20",
                    border: "border-amber-200 dark:border-amber-800"
                };
            case "completed":
                return {
                    icon: <CheckCircle2 className="w-5 h-5" />,
                    color: "text-green-500",
                    bg: "bg-green-50 dark:bg-green-900/20",
                    border: "border-green-200 dark:border-green-800"
                };
            case "failed":
                return {
                    icon: <XCircle className="w-5 h-5" />,
                    color: "text-red-500",
                    bg: "bg-red-50 dark:bg-red-900/20",
                    border: "border-red-200 dark:border-red-800"
                };
            default:
                return {
                    icon: <Play className="w-5 h-5" />,
                    color: "text-gray-500",
                    bg: "bg-muted/30 dark:bg-gray-900/20",
                    border: "border-gray-200 dark:border-gray-800"
                };
        }
    };

    const statusInfo = getStatusInfo();

    // Filter logs
    const filteredLogs = currentExecution.logs.filter((log) => {
        if (logLevelFilter !== "all" && log.level !== logLevelFilter) return false;
        if (nodeFilter !== "all" && log.nodeId !== nodeFilter) return false;
        return true;
    });

    // Get unique node IDs for filter
    const uniqueNodes = Array.from(
        new Set(currentExecution.logs.map((log) => log.nodeId).filter(Boolean))
    );

    // Format duration
    const formatDuration = (ms: number | null) => {
        if (ms === null) return "N/A";
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    };

    // Get log level color
    const getLogLevelColor = (level: string) => {
        switch (level) {
            case "error":
                return "text-red-500";
            case "warn":
                return "text-amber-500";
            case "debug":
                return "text-purple-500";
            default:
                return "text-muted-foreground";
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Status Banner */}
            <div className={cn("p-4 border-b", statusInfo.bg, statusInfo.border)}>
                <div className="flex items-center gap-3">
                    <div className={statusInfo.color}>{statusInfo.icon}</div>
                    <div className="flex-1">
                        <h4 className="font-semibold capitalize">{currentExecution.status}</h4>
                        <p className="text-xs text-muted-foreground">
                            Started {currentExecution.startedAt.toLocaleTimeString()} •{" "}
                            {formatDuration(
                                currentExecution.duration ||
                                    Date.now() - currentExecution.startedAt.getTime()
                            )}
                        </p>
                    </div>
                    {currentExecution.status === "running" && (
                        <button
                            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                            title="Cancel execution"
                        >
                            <StopCircle className="w-4 h-4" />
                            Cancel
                        </button>
                    )}
                    {currentExecution.status === "paused" && currentExecution.pauseContext && (
                        <Button
                            onClick={() => setShowResponseDialog(true)}
                            className="flex items-center gap-2"
                        >
                            <MessageSquareText className="w-4 h-4" />
                            Respond
                        </Button>
                    )}
                </div>
            </div>

            {/* Variables Section */}
            {currentExecution.variables.size > 0 && (
                <div className="p-4 border-b bg-muted/30">
                    <h5 className="text-sm font-medium mb-2">Variables</h5>
                    <div className="space-y-1">
                        {Array.from(currentExecution.variables.entries()).map(([key, value]) => (
                            <div key={key} className="text-xs flex gap-2">
                                <span className="font-mono text-primary">{key}:</span>
                                <span className="font-mono text-muted-foreground truncate">
                                    {JSON.stringify(value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Logs Header with Filters */}
            <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
                <h5 className="text-sm font-medium">
                    Logs ({filteredLogs.length}/{currentExecution.logs.length})
                </h5>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="p-1.5 hover:bg-muted rounded transition-colors flex items-center gap-1 text-xs"
                >
                    <Filter className="w-3.5 h-3.5" />
                    Filters
                    <ChevronDown
                        className={cn(
                            "w-3.5 h-3.5 transition-transform",
                            showFilters && "rotate-180"
                        )}
                    />
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="p-3 border-b bg-muted/10 flex gap-3">
                    <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Level</label>
                        <Select
                            value={logLevelFilter}
                            onChange={(value) => setLogLevelFilter(value as LogLevel)}
                            options={[
                                { value: "all", label: "All Levels" },
                                { value: "info", label: "Info" },
                                { value: "debug", label: "Debug" },
                                { value: "warn", label: "Warning" },
                                { value: "error", label: "Error" }
                            ]}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Node</label>
                        <Select
                            value={nodeFilter}
                            onChange={setNodeFilter}
                            options={[
                                { value: "all", label: "All Nodes" },
                                ...uniqueNodes
                                    .filter((id): id is string => !!id)
                                    .map((nodeId) => ({
                                        value: nodeId,
                                        label: nodeId
                                    }))
                            ]}
                        />
                    </div>
                </div>
            )}

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs">
                {filteredLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No logs to display</div>
                ) : (
                    filteredLogs.map((log) => (
                        <div
                            key={log.id}
                            className="flex gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                        >
                            <span className="text-muted-foreground flex-shrink-0">
                                {log.timestamp.toLocaleTimeString()}
                            </span>
                            <span
                                className={cn(
                                    "uppercase font-semibold flex-shrink-0 w-12",
                                    getLogLevelColor(log.level)
                                )}
                            >
                                {log.level}
                            </span>
                            {log.nodeId && (
                                <span className="text-primary flex-shrink-0">[{log.nodeId}]</span>
                            )}
                            <span className="flex-1 break-words">{log.message}</span>
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </div>

            {/* User Response Dialog */}
            {currentExecution.pauseContext && (
                <UserResponseDialog
                    isOpen={showResponseDialog}
                    onClose={() => setShowResponseDialog(false)}
                    onSubmit={handleSubmitResponse}
                    pauseContext={currentExecution.pauseContext as ExecutionPauseContext}
                    nodeName={currentExecution.pauseContext.nodeName}
                />
            )}
        </div>
    );
}
