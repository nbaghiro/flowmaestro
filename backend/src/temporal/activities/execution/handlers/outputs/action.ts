/**
 * Action Node Execution
 *
 * Complete execution logic and handler for action nodes.
 * Action nodes perform tasks in external applications (send, create, update, delete).
 * Uses the same Provider SDK system as Integration nodes.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { ExecutionRouter } from "../../../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../../../integrations/registry";
import { ConnectionRepository } from "../../../../../storage/repositories/ConnectionRepository";
import { createActivityLogger, getExecutionContext } from "../../../../core";
import { BaseNodeHandler, type NodeHandlerInput, type NodeHandlerOutput } from "../../types";

const connectionRepository = new ConnectionRepository();
const logger = createActivityLogger({ nodeType: "Action" });

// Initialize execution router (handles sandbox routing internally)
const executionRouter = new ExecutionRouter(providerRegistry);

// ============================================================================
// TYPES
// ============================================================================

export interface ActionNodeConfig {
    provider: string; // "slack", "gmail", etc.
    operation: string; // "sendMessage", "sendEmail", etc.
    connectionId: string; // Connection ID (always required)
    parameters: Record<string, unknown>; // Operation parameters
    outputVariable?: string;
    nodeId?: string; // Optional node ID for context
}

export interface ActionNodeResult {
    provider: string;
    operation: string;
    success: boolean;
    data?: unknown;
    error?: {
        type: string;
        message: string;
        retryable: boolean;
    };
    metadata?: {
        requestTime: number;
    };
}

// ============================================================================
// EXECUTOR FUNCTION
// ============================================================================

/**
 * Execute Action node using the Provider SDK system.
 * Action nodes perform write operations in external applications.
 */
export async function executeActionNode(
    config: ActionNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    logger.info("Executing action", {
        provider: config.provider,
        operation: config.operation
    });

    try {
        // Get connection with decrypted data
        const connection = await connectionRepository.findByIdWithData(config.connectionId);

        if (!connection) {
            throw new Error(`Connection ${config.connectionId} not found`);
        }

        if (connection.status !== "active") {
            throw new Error(`Connection ${config.connectionId} is not active`);
        }

        // Execute via router
        const result = await executionRouter.execute(
            config.provider,
            config.operation,
            config.parameters,
            connection,
            {
                mode: "workflow",
                workflowId: (context.workflowId as string) || "",
                nodeId: config.nodeId || ""
            }
        );

        // Build response
        const response: ActionNodeResult = {
            provider: config.provider,
            operation: config.operation,
            success: result.success,
            data: result.data,
            error: result.error,
            metadata: {
                requestTime: Date.now() - startTime
            }
        };

        logger.info("Action completed", {
            requestTime: response.metadata?.requestTime || 0,
            success: response.success
        });

        // Return with output variable if specified
        if (config.outputVariable) {
            return {
                ...context,
                [config.outputVariable]: result.success ? result.data : null
            } as JsonObject;
        }

        return {
            ...context,
            actionResult: response as unknown as JsonObject
        } as JsonObject;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        logger.error("Action error", new Error(errorMessage), {
            provider: config.provider,
            operation: config.operation
        });

        const response: ActionNodeResult = {
            provider: config.provider,
            operation: config.operation,
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: false
            },
            metadata: {
                requestTime: Date.now() - startTime
            }
        };

        if (config.outputVariable) {
            return {
                ...context,
                [config.outputVariable]: null,
                actionError: errorMessage
            } as JsonObject;
        }

        return {
            ...context,
            actionResult: response as unknown as JsonObject
        } as JsonObject;
    }
}

// ============================================================================
// HANDLER
// ============================================================================

/**
 * Handler for Action node type.
 * Action nodes perform tasks in external applications.
 */
export class ActionNodeHandler extends BaseNodeHandler {
    readonly name = "ActionNodeHandler";
    readonly supportedNodeTypes = ["action"] as const;

    async execute(input: NodeHandlerInput): Promise<NodeHandlerOutput> {
        const startTime = Date.now();
        const context = getExecutionContext(input.context);

        const result = await executeActionNode(
            input.nodeConfig as unknown as ActionNodeConfig,
            context
        );

        return this.success(
            result,
            {},
            {
                durationMs: Date.now() - startTime
            }
        );
    }
}

/**
 * Factory function for creating Action handler.
 */
export function createActionNodeHandler(): ActionNodeHandler {
    return new ActionNodeHandler();
}
