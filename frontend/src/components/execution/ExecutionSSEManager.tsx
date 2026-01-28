/**
 * Execution SSE Manager
 *
 * This component manages SSE connections for workflow executions.
 * It should be mounted once at a high level (e.g., FlowBuilder) and
 * stays mounted to maintain the SSE connection across UI changes.
 *
 * It has no UI - it only manages the SSE connection and updates the store.
 */

import { useEffect, useRef } from "react";
import { streamWorkflowExecution } from "../../lib/sse";
import { useWorkflowStore } from "../../stores/workflowStore";

export function ExecutionSSEManager() {
    const { currentExecution, updateExecutionStatus, updateNodeState, addExecutionLog } =
        useWorkflowStore();

    // Track SSE cleanup function
    const sseCleanupRef = useRef<(() => void) | null>(null);
    // Track which execution ID we're connected to
    const connectedExecutionIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Only set up SSE if there's a running execution and we're not already connected to it
        if (
            currentExecution?.status === "running" &&
            currentExecution.id !== connectedExecutionIdRef.current
        ) {
            // Clean up any existing connection first
            if (sseCleanupRef.current) {
                sseCleanupRef.current();
                sseCleanupRef.current = null;
            }

            const executionId = currentExecution.id;
            connectedExecutionIdRef.current = executionId;

            sseCleanupRef.current = streamWorkflowExecution(executionId, {
                onExecutionStarted: (data) => {
                    addExecutionLog({
                        level: "info",
                        message: `Workflow started: ${data.workflowName} (${data.totalNodes} nodes)`
                    });
                },
                onExecutionProgress: (data) => {
                    addExecutionLog({
                        level: "info",
                        message: `Progress: ${data.completed}/${data.total} nodes (${data.percentage}%)`
                    });
                },
                onExecutionCompleted: (data) => {
                    updateExecutionStatus("completed");
                    addExecutionLog({
                        level: "success",
                        message: `Workflow completed successfully in ${data.duration}ms`
                    });
                    // Clear connection tracking
                    connectedExecutionIdRef.current = null;
                    sseCleanupRef.current = null;
                },
                onExecutionFailed: (data) => {
                    updateExecutionStatus("failed");
                    addExecutionLog({
                        level: "error",
                        message: `Workflow failed: ${data.error}`
                    });
                    // Clear connection tracking
                    connectedExecutionIdRef.current = null;
                    sseCleanupRef.current = null;
                },
                onExecutionPaused: (data) => {
                    updateExecutionStatus("paused");
                    addExecutionLog({
                        level: "warning",
                        message: `Workflow paused: ${data.reason}`
                    });
                },
                onNodeStarted: (data) => {
                    updateNodeState(data.nodeId, {
                        status: "executing",
                        startedAt: new Date(data.timestamp)
                    });
                    addExecutionLog({
                        level: "info",
                        message: `Node started: ${data.nodeName} (${data.nodeType})`,
                        nodeId: data.nodeId
                    });
                },
                onNodeCompleted: (data) => {
                    updateNodeState(data.nodeId, {
                        status: "completed",
                        completedAt: new Date(data.timestamp),
                        output: data.output,
                        duration: data.duration
                    });
                    addExecutionLog({
                        level: "success",
                        message: `Node completed in ${data.duration}ms`,
                        nodeId: data.nodeId
                    });
                },
                onNodeFailed: (data) => {
                    updateNodeState(data.nodeId, {
                        status: "failed",
                        completedAt: new Date(data.timestamp),
                        error: data.error
                    });
                    addExecutionLog({
                        level: "error",
                        message: `Node failed: ${data.error}`,
                        nodeId: data.nodeId
                    });
                },
                onNodeRetry: (data) => {
                    addExecutionLog({
                        level: "warning",
                        message: `Retrying node (attempt ${data.attempt}): ${data.error}`,
                        nodeId: data.nodeId
                    });
                }
            });
        }

        // Cleanup when component unmounts
        return () => {
            if (sseCleanupRef.current) {
                sseCleanupRef.current();
                sseCleanupRef.current = null;
                connectedExecutionIdRef.current = null;
            }
        };
    }, [
        currentExecution?.id,
        currentExecution?.status,
        addExecutionLog,
        updateExecutionStatus,
        updateNodeState
    ]);

    // This component renders nothing - it only manages SSE connections
    return null;
}
