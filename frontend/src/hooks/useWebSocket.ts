/**
 * React hook for WebSocket real-time updates
 */

import { useEffect, useCallback, useState } from "react";
import { WebSocketEvent } from "@flowmaestro/shared";
import { logger } from "../lib/logger";
import { wsClient } from "../lib/websocket";

export function useWebSocket(token: string | null) {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) {
            return;
        }

        // Connect to WebSocket
        wsClient
            .connect(token)
            .then(() => setIsConnected(true))
            .catch((error) => {
                logger.error("Failed to connect to WebSocket", error);
                setIsConnected(false);
            });

        // Check connection status periodically
        const interval = setInterval(() => {
            setIsConnected(wsClient.isConnected());
        }, 1000);

        return () => {
            clearInterval(interval);
            wsClient.disconnect();
            setIsConnected(false);
        };
    }, [token]);

    const subscribe = useCallback((eventType: string, handler: (event: WebSocketEvent) => void) => {
        wsClient.on(eventType, handler);

        return () => {
            wsClient.off(eventType, handler);
        };
    }, []);

    const subscribeToExecution = useCallback((executionId: string) => {
        wsClient.subscribeToExecution(executionId);
    }, []);

    const unsubscribeFromExecution = useCallback((executionId: string) => {
        wsClient.unsubscribeFromExecution(executionId);
    }, []);

    return {
        isConnected,
        subscribe,
        subscribeToExecution,
        unsubscribeFromExecution
    };
}

/**
 * Hook to subscribe to execution events
 */
export function useExecutionEvents(
    executionId: string | null,
    handlers: {
        onStart?: (event: WebSocketEvent) => void;
        onProgress?: (event: WebSocketEvent) => void;
        onNodeStart?: (event: WebSocketEvent) => void;
        onNodeComplete?: (event: WebSocketEvent) => void;
        onNodeFail?: (event: WebSocketEvent) => void;
        onComplete?: (event: WebSocketEvent) => void;
        onFail?: (event: WebSocketEvent) => void;
    }
) {
    useEffect(() => {
        if (!executionId) {
            return;
        }

        // Subscribe to execution
        wsClient.subscribeToExecution(executionId);

        // Register handlers
        const unsubscribers: (() => void)[] = [];

        if (handlers.onStart) {
            wsClient.on("execution:started", handlers.onStart);
            unsubscribers.push(() => wsClient.off("execution:started", handlers.onStart!));
        }

        if (handlers.onProgress) {
            wsClient.on("execution:progress", handlers.onProgress);
            unsubscribers.push(() => wsClient.off("execution:progress", handlers.onProgress!));
        }

        if (handlers.onNodeStart) {
            wsClient.on("node:started", handlers.onNodeStart);
            unsubscribers.push(() => wsClient.off("node:started", handlers.onNodeStart!));
        }

        if (handlers.onNodeComplete) {
            wsClient.on("node:completed", handlers.onNodeComplete);
            unsubscribers.push(() => wsClient.off("node:completed", handlers.onNodeComplete!));
        }

        if (handlers.onNodeFail) {
            wsClient.on("node:failed", handlers.onNodeFail);
            unsubscribers.push(() => wsClient.off("node:failed", handlers.onNodeFail!));
        }

        if (handlers.onComplete) {
            wsClient.on("execution:completed", handlers.onComplete);
            unsubscribers.push(() => wsClient.off("execution:completed", handlers.onComplete!));
        }

        if (handlers.onFail) {
            wsClient.on("execution:failed", handlers.onFail);
            unsubscribers.push(() => wsClient.off("execution:failed", handlers.onFail!));
        }

        // Cleanup
        return () => {
            unsubscribers.forEach((unsub) => unsub());
            wsClient.unsubscribeFromExecution(executionId);
        };
    }, [executionId, handlers]);
}
