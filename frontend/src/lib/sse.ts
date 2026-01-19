/**
 * SSE (Server-Sent Events) Streaming Client for FlowMaestro
 *
 * Centralized streaming functions for all real-time event streams.
 * Each function returns a cleanup function to close the connection.
 */

import type {
    JsonObject,
    JsonValue,
    GenerationChatResponse,
    WorkflowPlan
} from "@flowmaestro/shared";
import { getCurrentWorkspaceId } from "../stores/workspaceStore";
import { getAuthToken } from "./api";
import { logger } from "./logger";
import type { ChatWorkflowResponse, ThreadMessage, ThreadTokenUsage } from "./api";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ============================================================================
// Callback Interfaces
// ============================================================================

export interface ChatStreamCallbacks {
    onThinkingStart?: () => void;
    onThinkingToken?: (token: string) => void;
    onThinkingComplete?: (content: string) => void;
    onToken: (token: string) => void;
    onComplete: (data: ChatWorkflowResponse) => void;
    onError: (error: string) => void;
}

export interface AgentStreamCallbacks {
    onToken?: (token: string) => void;
    onMessage?: (message: ThreadMessage) => void;
    onToolCallStarted?: (data: { toolName: string; arguments: JsonObject }) => void;
    onToolCallCompleted?: (data: { toolName: string; result: JsonObject }) => void;
    onToolCallFailed?: (data: { toolName: string; error: string }) => void;
    onCompleted?: (data: { finalMessage: string; iterations: number }) => void;
    onError?: (error: string) => void;
    onConnected?: () => void;
    onTokenUsageUpdated?: (data: {
        threadId: string;
        executionId: string;
        tokenUsage: ThreadTokenUsage;
    }) => void;
}

export interface WorkflowExecutionStreamCallbacks {
    onConnected?: () => void;
    onExecutionStarted?: (data: { workflowName: string; totalNodes: number }) => void;
    onExecutionProgress?: (data: { completed: number; total: number; percentage: number }) => void;
    onExecutionCompleted?: (data: { duration: number; outputs?: JsonObject }) => void;
    onExecutionFailed?: (data: { error: string }) => void;
    onExecutionPaused?: (data: {
        reason: string;
        nodeId: string;
        nodeName?: string;
        pauseContext?: JsonObject;
    }) => void;
    onNodeStarted?: (data: {
        nodeId: string;
        nodeName: string;
        nodeType: string;
        timestamp: string;
    }) => void;
    onNodeCompleted?: (data: {
        nodeId: string;
        nodeName: string;
        nodeType: string;
        output?: JsonValue;
        duration: number;
        timestamp: string;
    }) => void;
    onNodeFailed?: (data: {
        nodeId: string;
        nodeName: string;
        nodeType: string;
        error: string;
        timestamp: string;
    }) => void;
    onNodeRetry?: (data: {
        nodeId: string;
        nodeName: string;
        attempt: number;
        error: string;
    }) => void;
    onError?: (error: string) => void;
}

export interface KnowledgeBaseStreamCallbacks {
    onConnected?: () => void;
    onDocumentProcessing?: (data: {
        documentId: string;
        documentName: string;
        timestamp: string;
    }) => void;
    onDocumentCompleted?: (data: {
        documentId: string;
        chunkCount: number;
        timestamp: string;
    }) => void;
    onDocumentFailed?: (data: { documentId: string; error: string; timestamp: string }) => void;
    onError?: (error: string) => void;
}

export interface GenerationChatStreamCallbacks {
    onThinkingStart?: () => void;
    onThinkingToken?: (token: string) => void;
    onThinkingComplete?: (content: string) => void;
    onToken?: (token: string) => void;
    onPlanDetected?: (plan: WorkflowPlan) => void;
    onComplete?: (response: GenerationChatResponse) => void;
    onError?: (error: string) => void;
}

// ============================================================================
// Stream Functions
// ============================================================================

/**
 * Stream chat response via SSE for workflow chat
 */
export function streamChatResponse(
    executionId: string,
    callbacks: ChatStreamCallbacks
): () => void {
    const token = getAuthToken();
    const url = new URL(`${API_BASE_URL}/workflows/chat-stream/${executionId}`);

    if (token) {
        url.searchParams.set("token", token);
    }

    const eventSource = new EventSource(url.toString());

    eventSource.addEventListener("connected", (event) => {
        logger.debug("SSE Connected", { eventData: event.data });
    });

    eventSource.addEventListener("thinking_start", () => {
        callbacks.onThinkingStart?.();
    });

    eventSource.addEventListener("thinking_token", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onThinkingToken?.(data.token);
    });

    eventSource.addEventListener("thinking_complete", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onThinkingComplete?.(data.content);
    });

    eventSource.addEventListener("token", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onToken(data.token);
    });

    eventSource.addEventListener("complete", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onComplete(data as ChatWorkflowResponse);
        eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
        try {
            const data = JSON.parse((event as MessageEvent).data);
            callbacks.onError(data.message);
        } catch {
            callbacks.onError("Connection error");
        }
        eventSource.close();
    });

    eventSource.onerror = () => {
        callbacks.onError("Connection lost");
        eventSource.close();
    };

    return () => {
        eventSource.close();
    };
}

/**
 * Stream agent execution events via SSE
 */
export function streamAgentExecution(
    agentId: string,
    executionId: string,
    callbacks: AgentStreamCallbacks
): () => void {
    const token = getAuthToken();
    if (!token) {
        callbacks.onError?.("Authentication required");
        return () => {};
    }

    const workspaceId = getCurrentWorkspaceId();
    if (!workspaceId) {
        callbacks.onError?.("Workspace context required");
        return () => {};
    }

    const url = `${API_BASE_URL}/agents/${agentId}/executions/${executionId}/stream?token=${encodeURIComponent(token)}&workspaceId=${encodeURIComponent(workspaceId)}`;

    const eventSource = new EventSource(url, {
        withCredentials: true
    });

    let intentionallyClosed = false;

    eventSource.addEventListener("connected", () => {
        callbacks.onConnected?.();
    });

    eventSource.addEventListener("token", (event) => {
        try {
            const data = JSON.parse(event.data) as { token: string; executionId: string };
            if (data.executionId === executionId) {
                callbacks.onToken?.(data.token);
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("message", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                message: ThreadMessage;
                executionId: string;
            };
            if (data.executionId === executionId && data.message) {
                callbacks.onMessage?.(data.message);
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("tool_call_started", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                toolName: string;
                arguments: JsonObject;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onToolCallStarted?.({
                    toolName: data.toolName,
                    arguments: data.arguments
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("tool_call_completed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                toolName: string;
                result: JsonObject;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onToolCallCompleted?.({
                    toolName: data.toolName,
                    result: data.result
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("tool_call_failed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                toolName: string;
                error: string;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onToolCallFailed?.({
                    toolName: data.toolName,
                    error: data.error
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("thread:tokens:updated", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                threadId: string;
                executionId: string;
                tokenUsage: ThreadTokenUsage & { lastUpdated?: string };
            };

            if (data.executionId === executionId && data.tokenUsage) {
                const tokenUsage: ThreadTokenUsage = {
                    ...data.tokenUsage,
                    lastUpdatedAt:
                        data.tokenUsage.lastUpdatedAt ||
                        data.tokenUsage.lastUpdated ||
                        new Date().toISOString()
                };

                callbacks.onTokenUsageUpdated?.({
                    threadId: data.threadId,
                    executionId: data.executionId,
                    tokenUsage
                });
            }
        } catch (e) {
            logger.warn("Failed to parse token usage update event", { error: e });
        }
    });

    eventSource.addEventListener("completed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                finalMessage: string;
                iterations: number;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onCompleted?.({
                    finalMessage: data.finalMessage,
                    iterations: data.iterations
                });
                intentionallyClosed = true;
                eventSource.close();
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("error", (event) => {
        try {
            const data = JSON.parse((event as MessageEvent).data) as {
                error: string;
                executionId: string;
            };
            if (data.executionId === executionId) {
                callbacks.onError?.(data.error);
                intentionallyClosed = true;
                eventSource.close();
            }
        } catch {
            callbacks.onError?.("Stream connection error");
        }
    });

    eventSource.onerror = () => {
        if (intentionallyClosed || eventSource.readyState === EventSource.CLOSED) {
            return;
        }
        callbacks.onError?.("Stream connection failed");
    };

    return () => {
        intentionallyClosed = true;
        eventSource.close();
    };
}

/**
 * Stream workflow execution events via SSE
 */
export function streamWorkflowExecution(
    executionId: string,
    callbacks: WorkflowExecutionStreamCallbacks
): () => void {
    const token = getAuthToken();
    if (!token) {
        callbacks.onError?.("Authentication required");
        return () => {};
    }

    const workspaceId = getCurrentWorkspaceId();
    if (!workspaceId) {
        callbacks.onError?.("Workspace context required");
        return () => {};
    }

    const url = `${API_BASE_URL}/executions/${executionId}/stream?token=${encodeURIComponent(token)}&workspaceId=${encodeURIComponent(workspaceId)}`;

    const eventSource = new EventSource(url, {
        withCredentials: true
    });

    let intentionallyClosed = false;

    eventSource.addEventListener("connected", () => {
        callbacks.onConnected?.();
    });

    eventSource.addEventListener("execution:started", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                workflowName: string;
                totalNodes: number;
            };
            if (data.executionId === executionId) {
                callbacks.onExecutionStarted?.({
                    workflowName: data.workflowName,
                    totalNodes: data.totalNodes
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("execution:progress", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                completed: number;
                total: number;
                percentage: number;
            };
            if (data.executionId === executionId) {
                callbacks.onExecutionProgress?.({
                    completed: data.completed,
                    total: data.total,
                    percentage: data.percentage
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("execution:completed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                duration: number;
                outputs?: JsonObject;
            };
            if (data.executionId === executionId) {
                callbacks.onExecutionCompleted?.({
                    duration: data.duration,
                    outputs: data.outputs
                });
                intentionallyClosed = true;
                eventSource.close();
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("execution:failed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                error: string;
            };
            if (data.executionId === executionId) {
                callbacks.onExecutionFailed?.({
                    error: data.error
                });
                intentionallyClosed = true;
                eventSource.close();
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("execution:paused", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                reason: string;
                nodeId: string;
                nodeName?: string;
                pauseContext?: JsonObject;
            };
            if (data.executionId === executionId) {
                callbacks.onExecutionPaused?.({
                    reason: data.reason,
                    nodeId: data.nodeId,
                    nodeName: data.nodeName,
                    pauseContext: data.pauseContext
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("node:started", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                nodeId: string;
                nodeName: string;
                nodeType: string;
                timestamp: string;
            };
            if (data.executionId === executionId) {
                callbacks.onNodeStarted?.({
                    nodeId: data.nodeId,
                    nodeName: data.nodeName,
                    nodeType: data.nodeType,
                    timestamp: data.timestamp
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("node:completed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                nodeId: string;
                nodeName: string;
                nodeType: string;
                output?: JsonValue;
                duration: number;
                timestamp: string;
            };
            if (data.executionId === executionId) {
                callbacks.onNodeCompleted?.({
                    nodeId: data.nodeId,
                    nodeName: data.nodeName,
                    nodeType: data.nodeType,
                    output: data.output,
                    duration: data.duration,
                    timestamp: data.timestamp
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("node:failed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                nodeId: string;
                nodeName: string;
                nodeType: string;
                error: string;
                timestamp: string;
            };
            if (data.executionId === executionId) {
                callbacks.onNodeFailed?.({
                    nodeId: data.nodeId,
                    nodeName: data.nodeName,
                    nodeType: data.nodeType,
                    error: data.error,
                    timestamp: data.timestamp
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("node:retry", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                executionId: string;
                nodeId: string;
                nodeName: string;
                attempt: number;
                error: string;
            };
            if (data.executionId === executionId) {
                callbacks.onNodeRetry?.({
                    nodeId: data.nodeId,
                    nodeName: data.nodeName,
                    attempt: data.attempt,
                    error: data.error
                });
            }
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.onerror = (error) => {
        logger.error("EventSource error", {
            executionId,
            readyState: eventSource.readyState,
            readyStateText:
                eventSource.readyState === EventSource.CONNECTING
                    ? "CONNECTING"
                    : eventSource.readyState === EventSource.OPEN
                      ? "OPEN"
                      : "CLOSED",
            intentionallyClosed,
            error
        });
        if (intentionallyClosed || eventSource.readyState === EventSource.CLOSED) {
            return;
        }
        callbacks.onError?.("Stream connection failed");
    };

    return () => {
        intentionallyClosed = true;
        eventSource.close();
    };
}

/**
 * Stream knowledge base document processing events via SSE
 */
export function streamKnowledgeBase(
    knowledgeBaseId: string,
    callbacks: KnowledgeBaseStreamCallbacks
): () => void {
    const token = getAuthToken();
    if (!token) {
        callbacks.onError?.("Authentication required");
        return () => {};
    }

    const workspaceId = getCurrentWorkspaceId();
    if (!workspaceId) {
        callbacks.onError?.("Workspace context required");
        return () => {};
    }

    const url = `${API_BASE_URL}/knowledge-bases/${knowledgeBaseId}/stream?token=${encodeURIComponent(token)}&workspaceId=${encodeURIComponent(workspaceId)}`;

    const eventSource = new EventSource(url, {
        withCredentials: true
    });

    let intentionallyClosed = false;

    eventSource.addEventListener("connected", () => {
        callbacks.onConnected?.();
    });

    eventSource.addEventListener("document:processing", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                documentId: string;
                documentName: string;
                timestamp: string;
            };
            callbacks.onDocumentProcessing?.(data);
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("document:completed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                documentId: string;
                chunkCount: number;
                timestamp: string;
            };
            callbacks.onDocumentCompleted?.(data);
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.addEventListener("document:failed", (event) => {
        try {
            const data = JSON.parse(event.data) as {
                documentId: string;
                error: string;
                timestamp: string;
            };
            callbacks.onDocumentFailed?.(data);
        } catch {
            // Silently ignore parsing errors
        }
    });

    eventSource.onerror = () => {
        if (intentionallyClosed || eventSource.readyState === EventSource.CLOSED) {
            return;
        }
        callbacks.onError?.("Stream connection failed");
    };

    return () => {
        intentionallyClosed = true;
        eventSource.close();
    };
}

/**
 * Stream generation chat response via SSE
 * Handles thinking tokens, response tokens, and workflow plan events
 */
export function streamGenerationChatResponse(
    executionId: string,
    callbacks: GenerationChatStreamCallbacks
): () => void {
    const token = getAuthToken();
    const url = new URL(`${API_BASE_URL}/workflows/generation/chat-stream/${executionId}`);

    if (token) {
        url.searchParams.set("token", token);
    }

    const eventSource = new EventSource(url.toString());

    eventSource.addEventListener("connected", (event) => {
        logger.debug("Generation chat SSE connected", { eventData: event.data });
    });

    eventSource.addEventListener("thinking_start", () => {
        callbacks.onThinkingStart?.();
    });

    eventSource.addEventListener("thinking_token", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onThinkingToken?.(data.token);
    });

    eventSource.addEventListener("thinking_complete", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onThinkingComplete?.(data.content);
    });

    eventSource.addEventListener("token", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onToken?.(data.token);
    });

    eventSource.addEventListener("plan_detected", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onPlanDetected?.(data.plan as WorkflowPlan);
    });

    eventSource.addEventListener("complete", (event) => {
        const data = JSON.parse(event.data);
        callbacks.onComplete?.(data as GenerationChatResponse);
        eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
        try {
            const data = JSON.parse((event as MessageEvent).data);
            callbacks.onError?.(data.message);
        } catch {
            callbacks.onError?.("Connection error");
        }
        eventSource.close();
    });

    eventSource.onerror = () => {
        callbacks.onError?.("Connection lost");
        eventSource.close();
    };

    return () => {
        eventSource.close();
    };
}
