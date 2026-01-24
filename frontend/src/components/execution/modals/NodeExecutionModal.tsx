/**
 * Node Execution Modal Component
 * Displays detailed execution information for a specific node
 */

import { X, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { NodeExecutionState } from "../../../stores/workflowStore";
import { MediaOutput, hasMediaContent } from "../../common/MediaOutput";

interface NodeExecutionModalProps {
    nodeId: string;
    nodeName: string;
    executionState: NodeExecutionState;
    onClose: () => void;
    nodePosition?: { x: number; y: number };
}

export function NodeExecutionModal({
    nodeId,
    nodeName,
    executionState,
    onClose,
    nodePosition
}: NodeExecutionModalProps) {
    // Calculate modal position
    const getModalStyle = (): React.CSSProperties => {
        if (!nodePosition) {
            // Fallback to centered if no position provided
            return {};
        }

        // Position above the node with some offset
        const modalWidth = 600; // Approximate width
        const modalHeight = 400; // Approximate max height
        const offsetY = 20; // Space above the node

        return {
            position: "absolute",
            left: `${nodePosition.x - modalWidth / 2}px`,
            top: `${nodePosition.y - modalHeight - offsetY}px`,
            transform: "none"
        };
    };

    // Get status info
    const getStatusInfo = () => {
        switch (executionState.status) {
            case "pending":
                return {
                    icon: <Clock className="w-5 h-5" />,
                    color: "text-yellow-500",
                    bg: "bg-yellow-50 dark:bg-yellow-900/20",
                    label: "Pending"
                };
            case "running":
                return {
                    icon: <Clock className="w-5 h-5 animate-spin" />,
                    color: "text-blue-500",
                    bg: "bg-blue-50 dark:bg-blue-900/20",
                    label: "Running"
                };
            case "success":
                return {
                    icon: <CheckCircle2 className="w-5 h-5" />,
                    color: "text-green-500",
                    bg: "bg-green-50 dark:bg-green-900/20",
                    label: "Success"
                };
            case "error":
                return {
                    icon: <XCircle className="w-5 h-5" />,
                    color: "text-red-500",
                    bg: "bg-red-50 dark:bg-red-900/20",
                    label: "Error"
                };
            default:
                return {
                    icon: <AlertCircle className="w-5 h-5" />,
                    color: "text-muted-foreground",
                    bg: "bg-muted/30",
                    label: "Idle"
                };
        }
    };

    const statusInfo = getStatusInfo();

    // Format duration
    const formatDuration = (ms: number | null) => {
        if (ms === null) return "N/A";
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        const remainingMs = ms % 1000;
        if (seconds < 60) {
            return `${seconds}.${Math.floor(remainingMs / 100)}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />

            {/* Modal */}
            <div
                className={cn(
                    "fixed z-50 p-4 pointer-events-none",
                    nodePosition ? "inset-0" : "inset-0 flex items-center justify-center"
                )}
            >
                <div
                    className="bg-card border border-border/50 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
                    style={getModalStyle()}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className={statusInfo.color}>{statusInfo.icon}</div>
                            <div>
                                <h3 className="font-semibold">{nodeName}</h3>
                                <p className="text-xs text-muted-foreground">Node ID: {nodeId}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-muted rounded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Status Banner */}
                    <div className={cn("px-4 py-3 border-b", statusInfo.bg)}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium">{statusInfo.label}</h4>
                                <p className="text-xs text-muted-foreground">
                                    {executionState.startedAt && (
                                        <>
                                            Started at{" "}
                                            {executionState.startedAt.toLocaleTimeString()}
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">
                                    Duration: {formatDuration(executionState.duration)}
                                </p>
                                {executionState.retryCount !== undefined &&
                                    executionState.retryCount > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Retries: {executionState.retryCount}
                                        </p>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Error */}
                        {executionState.error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                <h5 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    Error
                                </h5>
                                <pre className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono">
                                    {executionState.error}
                                </pre>
                            </div>
                        )}

                        {/* Inputs */}
                        {executionState.input && Object.keys(executionState.input).length > 0 && (
                            <div>
                                <h5 className="font-medium mb-2 text-sm">Inputs</h5>
                                <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    <pre className="text-xs font-mono whitespace-pre-wrap">
                                        {JSON.stringify(executionState.input, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Output */}
                        {executionState.output && Object.keys(executionState.output).length > 0 && (
                            <div>
                                <h5 className="font-medium mb-2 text-sm">Output</h5>
                                {hasMediaContent(executionState.output) ? (
                                    <MediaOutput
                                        data={executionState.output}
                                        showJson={true}
                                        maxImages={4}
                                    />
                                ) : (
                                    <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                                        <pre className="text-xs font-mono whitespace-pre-wrap">
                                            {JSON.stringify(executionState.output, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Metadata */}
                        {executionState.metadata &&
                            Object.keys(executionState.metadata).length > 0 && (
                                <div>
                                    <h5 className="font-medium mb-2 text-sm">Metadata</h5>
                                    <div className="bg-muted/50 rounded-lg p-3">
                                        <div className="space-y-1">
                                            {Object.entries(executionState.metadata).map(
                                                ([key, value]) => (
                                                    <div key={key} className="flex gap-2 text-xs">
                                                        <span className="font-mono text-primary font-medium">
                                                            {key}:
                                                        </span>
                                                        <span className="font-mono text-muted-foreground">
                                                            {typeof value === "object"
                                                                ? JSON.stringify(value)
                                                                : String(value)}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* No data message */}
                        {!executionState.error &&
                            (!executionState.input ||
                                Object.keys(executionState.input).length === 0) &&
                            (!executionState.output ||
                                Object.keys(executionState.output).length === 0) &&
                            (!executionState.metadata ||
                                Object.keys(executionState.metadata).length === 0) && (
                                <div className="text-center text-muted-foreground py-8">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No execution data available yet</p>
                                </div>
                            )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-border bg-muted/30">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
