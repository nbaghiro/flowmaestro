import { task, metadata, wait } from "@trigger.dev/sdk/v3";
import type { JsonObject } from "@flowmaestro/shared";
import { handlerRegistry, NodeHandlerOutput } from "../node-handlers";
import type { ContextSnapshot } from "../shared/context-manager";

/**
 * Payload for individual node execution.
 */
export interface NodeExecutorPayload {
    /** Unique node identifier */
    nodeId: string;

    /** Node type (e.g., "llm", "http", "conditional") */
    nodeType: string;

    /** Node display name */
    nodeName: string;

    /** Node configuration */
    config: JsonObject;

    /** Current execution context snapshot */
    context: ContextSnapshot;

    /** User ID executing the workflow */
    userId: string;

    /** Execution ID */
    executionId: string;

    /** Optional: Connection ID for integrations */
    connectionId?: string;
}

/**
 * Result from node execution.
 */
export interface NodeExecutorResult extends NodeHandlerOutput {
    /** Node ID that was executed */
    nodeId: string;

    /** Node type */
    nodeType: string;
}

/**
 * Node Executor Task
 *
 * Executes individual workflow nodes using the handler registry.
 * Handles:
 * - LLM streaming via Trigger.dev Realtime
 * - Pause/resume via waitpoints
 * - Error routing via signals
 */
export const nodeExecutor = task({
    id: "node-executor",
    retry: {
        maxAttempts: 3,
        minTimeoutInMs: 1000,
        maxTimeoutInMs: 10000,
        factor: 2
    },
    run: async (payload: NodeExecutorPayload): Promise<NodeExecutorResult> => {
        const { nodeId, nodeType, nodeName, config, context, userId, executionId, connectionId } =
            payload;

        const startTime = Date.now();

        // Set metadata for tracking
        await metadata.set("nodeId", nodeId);
        await metadata.set("nodeType", nodeType);
        await metadata.set("nodeName", nodeName);
        await metadata.set("status", "running");

        try {
            // Get the appropriate handler for this node type
            const handler = handlerRegistry.getHandler(nodeType);

            // Execute the node
            const result = await handler.execute({
                nodeId,
                nodeType,
                nodeName,
                config,
                context,
                userId,
                executionId,
                connectionId
            });

            // Handle pause signal with waitpoint
            if (result.signals?.pause) {
                const { waitpointId, reason } = result.signals.pause;

                await metadata.set("status", "waiting");
                await metadata.set("waitpointId", waitpointId);
                await metadata.set("waitReason", reason);

                // Create a waitpoint token for human-in-the-loop
                const token = await wait.createToken({
                    idempotencyKey: waitpointId,
                    timeout: "7d", // 7-day timeout for human-in-the-loop
                    tags: [`execution-${executionId}`, `node-${nodeId}`]
                });

                // Wait for user input using Trigger.dev waitpoint
                const waitResult = await wait.forToken<JsonObject>(token);

                if (!waitResult.ok) {
                    // Waitpoint timed out or errored
                    result.data = {
                        ...result.data,
                        waitpointTimedOut: true,
                        waitpointError: waitResult.error?.message
                    };
                } else {
                    // Merge user input into result
                    result.data = {
                        ...result.data,
                        userInput: waitResult.output
                    };
                }

                result.signals.pause = undefined; // Clear pause signal
                await metadata.set("status", "resumed");
            }

            // Update final status
            await metadata.set("status", result.success ? "completed" : "failed");
            await metadata.set("durationMs", Date.now() - startTime);

            if (result.error) {
                await metadata.set("error", result.error.message);
            }

            if (result.streaming) {
                await metadata.set("streamId", result.streaming.streamId);
            }

            return {
                ...result,
                nodeId,
                nodeType
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;

            await metadata.set("status", "failed");
            await metadata.set("error", errorMessage);
            await metadata.set("durationMs", Date.now() - startTime);

            return {
                nodeId,
                nodeType,
                success: false,
                error: {
                    message: errorMessage,
                    stack: errorStack,
                    retryable: isRetryableError(error)
                },
                signals: {
                    activateErrorPort: true
                }
            };
        }
    }
});

/**
 * Determine if an error is retryable.
 */
function isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const message = error.message.toLowerCase();

    // Network errors are usually retryable
    if (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnreset") ||
        message.includes("econnrefused")
    ) {
        return true;
    }

    // Rate limiting is retryable
    if (message.includes("rate limit") || message.includes("too many requests")) {
        return true;
    }

    // Temporary server errors
    if (message.includes("503") || message.includes("502") || message.includes("504")) {
        return true;
    }

    return false;
}
