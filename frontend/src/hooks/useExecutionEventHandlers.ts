import { useEffect } from "react";
import { logger } from "../lib/logger";
import { wsClient } from "../lib/websocket";
import { useWorkflowStore } from "../stores/workflowStore";

/**
 * Sets up global WebSocket event handlers for workflow execution events
 * This hook should be called once at the app level to connect events to the store
 */
export function useExecutionEventHandlers() {
    const { updateNodeState, updateExecutionStatus, addExecutionLog, updateVariable } =
        useWorkflowStore();

    useEffect(() => {
        // Execution lifecycle events
        const handleExecutionStarted = (event: unknown) => {
            logger.debug("Execution started", { event });
            const e = event as Record<string, unknown>;
            addExecutionLog({
                level: "info",
                message: `Workflow started: ${e.workflowName as string} (${e.totalNodes as number} nodes)`,
                timestamp: new Date(e.timestamp as string)
            });
        };

        const handleExecutionProgress = (event: unknown) => {
            logger.debug("Execution progress", { event });
            const e = event as Record<string, unknown>;
            addExecutionLog({
                level: "info",
                message: `Progress: ${e.completed as number}/${e.total as number} nodes (${e.percentage as number}%)`,
                timestamp: new Date(e.timestamp as string)
            });
        };

        const handleExecutionCompleted = (event: unknown) => {
            logger.info("Execution completed", { event });
            const e = event as Record<string, unknown>;
            updateExecutionStatus("completed");
            addExecutionLog({
                level: "success",
                message: `Workflow completed successfully in ${e.duration as number}ms`,
                timestamp: new Date(e.timestamp as string)
            });
        };

        const handleExecutionFailed = (event: unknown) => {
            logger.error("Execution failed", undefined, { event });
            const e = event as Record<string, unknown>;
            updateExecutionStatus("failed");
            addExecutionLog({
                level: "error",
                message: `Workflow failed: ${e.error as string}`,
                timestamp: new Date(e.timestamp as string)
            });
        };

        // Node lifecycle events
        const handleNodeStarted = (event: unknown) => {
            logger.debug("Node started", { event });
            const e = event as Record<string, unknown>;
            updateNodeState(e.nodeId as string, {
                status: "running",
                startedAt: new Date(e.timestamp as string)
            });
            addExecutionLog({
                level: "info",
                message: `Node started: ${e.nodeName as string} (${e.nodeType as string})`,
                nodeId: e.nodeId as string,
                timestamp: new Date(e.timestamp as string)
            });
        };

        const handleNodeCompleted = (event: unknown) => {
            logger.debug("Node completed", { event });
            const e = event as Record<string, unknown>;
            updateNodeState(e.nodeId as string, {
                status: "success",
                completedAt: new Date(e.timestamp as string),
                output: e.output as unknown as import("@flowmaestro/shared").JsonValue | undefined,
                duration: e.duration as number
            });
            addExecutionLog({
                level: "success",
                message: `Node completed in ${e.duration as number}ms`,
                nodeId: e.nodeId as string,
                timestamp: new Date(e.timestamp as string)
            });
        };

        const handleNodeFailed = (event: unknown) => {
            logger.error("Node failed", undefined, { event });
            const e = event as Record<string, unknown>;
            updateNodeState(e.nodeId as string, {
                status: "error",
                completedAt: new Date(e.timestamp as string),
                error: e.error as string
            });
            addExecutionLog({
                level: "error",
                message: `Node failed: ${e.error as string}`,
                nodeId: e.nodeId as string,
                timestamp: new Date(e.timestamp as string)
            });
        };

        const handleNodeRetry = (event: unknown) => {
            logger.warn("Node retry", { event });
            const e = event as Record<string, unknown>;
            addExecutionLog({
                level: "warning",
                message: `Retrying node (attempt ${e.attempt as number}): ${e.error as string}`,
                nodeId: e.nodeId as string,
                timestamp: new Date(e.timestamp as string)
            });
        };

        const handleNodeStream = (event: unknown) => {
            logger.debug("Node stream", { event });
            // Handle streaming data (e.g., LLM token generation)
            // You can implement custom handling for streaming nodes here
        };

        // Register all event handlers
        wsClient.on("execution:started", handleExecutionStarted);
        wsClient.on("execution:progress", handleExecutionProgress);
        wsClient.on("execution:completed", handleExecutionCompleted);
        wsClient.on("execution:failed", handleExecutionFailed);
        wsClient.on("node:started", handleNodeStarted);
        wsClient.on("node:completed", handleNodeCompleted);
        wsClient.on("node:failed", handleNodeFailed);
        wsClient.on("node:retry", handleNodeRetry);
        wsClient.on("node:stream", handleNodeStream);

        // Cleanup: Remove all event handlers when component unmounts
        return () => {
            wsClient.off("execution:started", handleExecutionStarted);
            wsClient.off("execution:progress", handleExecutionProgress);
            wsClient.off("execution:completed", handleExecutionCompleted);
            wsClient.off("execution:failed", handleExecutionFailed);
            wsClient.off("node:started", handleNodeStarted);
            wsClient.off("node:completed", handleNodeCompleted);
            wsClient.off("node:failed", handleNodeFailed);
            wsClient.off("node:retry", handleNodeRetry);
            wsClient.off("node:stream", handleNodeStream);
        };
    }, [updateNodeState, updateExecutionStatus, addExecutionLog, updateVariable]);
}
