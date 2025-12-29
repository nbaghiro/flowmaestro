/**
 * React Hook for SSE Execution Streaming
 *
 * Provides real-time execution updates via Server-Sent Events.
 * Manages connection lifecycle and event subscriptions.
 */

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import {
    ExecutionStreamClient,
    createExecutionStream,
    type ConnectionState,
    type ExecutionStreamEventType,
    type StreamEvent,
    type StreamEventHandler,
    type ExecutionStartedData,
    type ExecutionProgressData,
    type ExecutionCompletedData,
    type ExecutionFailedData,
    type NodeStartedData,
    type NodeCompletedData,
    type NodeFailedData,
    type NodeTokenData
} from "../lib/execution-stream";
import { logger } from "../lib/logger";

// Re-export types for consumers
export type {
    ConnectionState,
    ExecutionStreamEventType,
    StreamEvent,
    StreamEventHandler,
    ExecutionStartedData,
    ExecutionProgressData,
    ExecutionCompletedData,
    ExecutionFailedData,
    NodeStartedData,
    NodeCompletedData,
    NodeFailedData,
    NodeTokenData
};

/**
 * Execution stream state.
 */
export interface ExecutionStreamState {
    /** Current connection state */
    connectionState: ConnectionState;
    /** Whether connected */
    isConnected: boolean;
    /** Execution progress (0-100) */
    progress: number;
    /** Currently executing nodes */
    executingNodes: string[];
    /** Completed nodes count */
    completedNodesCount: number;
    /** Total nodes count */
    totalNodesCount: number;
    /** LLM tokens by node ID */
    tokensByNode: Map<string, string>;
    /** Last error message */
    lastError: string | null;
    /** Whether execution is complete */
    isComplete: boolean;
}

/**
 * Event handlers for execution stream.
 */
export interface ExecutionStreamHandlers {
    onStart?: (data: ExecutionStartedData) => void;
    onProgress?: (data: ExecutionProgressData) => void;
    onNodeStart?: (data: NodeStartedData) => void;
    onNodeComplete?: (data: NodeCompletedData) => void;
    onNodeFail?: (data: NodeFailedData) => void;
    onNodeToken?: (data: NodeTokenData) => void;
    onComplete?: (data: ExecutionCompletedData) => void;
    onFail?: (data: ExecutionFailedData) => void;
    onPause?: (data: Record<string, unknown>) => void;
    onResume?: (data: Record<string, unknown>) => void;
    onCancel?: (data: Record<string, unknown>) => void;
    onError?: (error: string) => void;
    onStateChange?: (state: ConnectionState) => void;
}

/**
 * Hook options.
 */
export interface UseExecutionStreamOptions {
    /** Auto-connect when executionId changes (default: true) */
    autoConnect?: boolean;
    /** Auto-disconnect when execution completes (default: false) */
    autoDisconnectOnComplete?: boolean;
}

/**
 * Hook to subscribe to SSE execution stream.
 *
 * @param executionId - Execution ID to stream (null to disconnect)
 * @param token - Auth token
 * @param handlers - Event handlers
 * @param options - Hook options
 */
export function useExecutionStream(
    executionId: string | null,
    token: string | null,
    handlers: ExecutionStreamHandlers = {},
    options: UseExecutionStreamOptions = {}
): ExecutionStreamState & {
    connect: () => void;
    disconnect: () => void;
} {
    const { autoConnect = true, autoDisconnectOnComplete = false } = options;

    // State
    const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
    const [progress, setProgress] = useState(0);
    const [executingNodes, setExecutingNodes] = useState<string[]>([]);
    const [completedNodesCount, setCompletedNodesCount] = useState(0);
    const [totalNodesCount, setTotalNodesCount] = useState(0);
    const [tokensByNode, setTokensByNode] = useState<Map<string, string>>(new Map());
    const [lastError, setLastError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Refs
    const clientRef = useRef<ExecutionStreamClient | null>(null);
    const handlersRef = useRef(handlers);

    // Keep handlers ref updated
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    // Connect function
    const connect = useCallback(() => {
        if (!executionId || !token) {
            logger.warn("Cannot connect: missing executionId or token");
            return;
        }

        // Cleanup existing client
        if (clientRef.current) {
            clientRef.current.disconnect();
        }

        // Reset state
        setProgress(0);
        setExecutingNodes([]);
        setCompletedNodesCount(0);
        setTotalNodesCount(0);
        setTokensByNode(new Map());
        setLastError(null);
        setIsComplete(false);

        // Create new client
        const client = createExecutionStream(executionId, token);
        clientRef.current = client;

        // Subscribe to connection state
        client.onStateChange((state) => {
            setConnectionState(state);
            handlersRef.current.onStateChange?.(state);
        });

        // Subscribe to events
        client.on<ExecutionStartedData>("execution:started", (event) => {
            setTotalNodesCount(event.data.totalNodes);
            handlersRef.current.onStart?.(event.data);
        });

        client.on<ExecutionProgressData>("execution:progress", (event) => {
            setProgress(event.data.progress);
            setExecutingNodes(event.data.currentlyExecuting);
            setCompletedNodesCount(event.data.completedNodes);
            setTotalNodesCount(event.data.totalNodes);
            handlersRef.current.onProgress?.(event.data);
        });

        client.on<NodeStartedData>("node:started", (event) => {
            setExecutingNodes((prev) => [...prev, event.data.nodeId]);
            handlersRef.current.onNodeStart?.(event.data);
        });

        client.on<NodeCompletedData>("node:completed", (event) => {
            setExecutingNodes((prev) => prev.filter((id) => id !== event.data.nodeId));
            setCompletedNodesCount((prev) => prev + 1);
            handlersRef.current.onNodeComplete?.(event.data);
        });

        client.on<NodeFailedData>("node:failed", (event) => {
            setExecutingNodes((prev) => prev.filter((id) => id !== event.data.nodeId));
            if (!event.data.willRetry) {
                setLastError(event.data.error);
            }
            handlersRef.current.onNodeFail?.(event.data);
        });

        client.on<NodeTokenData>("node:token", (event) => {
            setTokensByNode((prev) => {
                const next = new Map(prev);
                const current = next.get(event.data.nodeId) || "";
                next.set(event.data.nodeId, current + event.data.token);
                return next;
            });
            handlersRef.current.onNodeToken?.(event.data);
        });

        client.on<ExecutionCompletedData>("execution:completed", (event) => {
            setProgress(100);
            setIsComplete(true);
            setExecutingNodes([]);
            handlersRef.current.onComplete?.(event.data);

            if (autoDisconnectOnComplete) {
                client.disconnect();
            }
        });

        client.on<ExecutionFailedData>("execution:failed", (event) => {
            setIsComplete(true);
            setLastError(event.data.error);
            setExecutingNodes([]);
            handlersRef.current.onFail?.(event.data);

            if (autoDisconnectOnComplete) {
                client.disconnect();
            }
        });

        client.on("execution:paused", (event) => {
            handlersRef.current.onPause?.(event.data);
        });

        client.on("execution:resumed", (event) => {
            handlersRef.current.onResume?.(event.data);
        });

        client.on("execution:cancelled", (event) => {
            setIsComplete(true);
            setExecutingNodes([]);
            handlersRef.current.onCancel?.(event.data);

            if (autoDisconnectOnComplete) {
                client.disconnect();
            }
        });

        client.on<{ error: string }>("error", (event) => {
            setLastError(event.data.error);
            handlersRef.current.onError?.(event.data.error);
        });
    }, [executionId, token, autoDisconnectOnComplete]);

    // Disconnect function
    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.disconnect();
            clientRef.current = null;
        }
    }, []);

    // Auto-connect effect
    useEffect(() => {
        if (autoConnect && executionId && token) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [executionId, token, autoConnect, connect, disconnect]);

    // Memoized state
    const state = useMemo(
        () => ({
            connectionState,
            isConnected: connectionState === "connected",
            progress,
            executingNodes,
            completedNodesCount,
            totalNodesCount,
            tokensByNode,
            lastError,
            isComplete,
            connect,
            disconnect
        }),
        [
            connectionState,
            progress,
            executingNodes,
            completedNodesCount,
            totalNodesCount,
            tokensByNode,
            lastError,
            isComplete,
            connect,
            disconnect
        ]
    );

    return state;
}

/**
 * Hook to get LLM token stream for a specific node.
 *
 * @param executionId - Execution ID
 * @param nodeId - Node ID to stream tokens for
 * @param token - Auth token
 */
export function useNodeTokenStream(
    executionId: string | null,
    nodeId: string,
    token: string | null
): {
    tokens: string;
    isStreaming: boolean;
    isComplete: boolean;
} {
    const [tokens, setTokens] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const { isConnected } = useExecutionStream(
        executionId,
        token,
        {
            onNodeToken: (data) => {
                if (data.nodeId === nodeId) {
                    setTokens((prev) => prev + data.token);
                    setIsStreaming(true);
                    if (data.isComplete) {
                        setIsComplete(true);
                        setIsStreaming(false);
                    }
                }
            },
            onNodeStart: (data) => {
                if (data.nodeId === nodeId) {
                    setTokens("");
                    setIsStreaming(false);
                    setIsComplete(false);
                }
            },
            onNodeComplete: (data) => {
                if (data.nodeId === nodeId) {
                    setIsComplete(true);
                    setIsStreaming(false);
                }
            },
            onNodeFail: (data) => {
                if (data.nodeId === nodeId && !data.willRetry) {
                    setIsComplete(true);
                    setIsStreaming(false);
                }
            }
        },
        { autoConnect: !!executionId && !!token }
    );

    return useMemo(
        () => ({
            tokens,
            isStreaming: isConnected && isStreaming,
            isComplete
        }),
        [tokens, isConnected, isStreaming, isComplete]
    );
}

export default useExecutionStream;
