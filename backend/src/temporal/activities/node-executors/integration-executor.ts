import type { JsonObject } from "@flowmaestro/shared";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";

const connectionRepository = new ConnectionRepository();

// Initialize execution router (no MCP service for now, will add later)
const executionRouter = new ExecutionRouter(providerRegistry);

export interface IntegrationNodeConfig {
    provider: string; // "slack", "coda", etc.
    operation: string; // "sendMessage", "listDocs", etc.
    connectionId: string; // Always required - connection ID
    parameters: Record<string, unknown>; // Operation parameters
    outputVariable?: string;
    nodeId?: string; // Optional node ID for context
}

export interface IntegrationNodeResult {
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

/**
 * Execute Integration node using the new Provider SDK system
 */
export async function executeIntegrationNode(
    config: IntegrationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    console.log(`[Integration] Provider: ${config.provider}, Operation: ${config.operation}`);

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
        const response: IntegrationNodeResult = {
            provider: config.provider,
            operation: config.operation,
            success: result.success,
            data: result.data,
            error: result.error,
            metadata: {
                requestTime: Date.now() - startTime
            }
        };

        console.log(
            `[Integration] Completed in ${response.metadata?.requestTime || 0}ms - Success: ${response.success}`
        );

        // Return with output variable if specified
        if (config.outputVariable) {
            return {
                ...context,
                [config.outputVariable]: result.success ? result.data : null
            } as JsonObject;
        }

        return {
            ...context,
            integrationResult: response as unknown as JsonObject
        } as JsonObject;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        console.error("[Integration] Error:", errorMessage);

        const response: IntegrationNodeResult = {
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
                integrationError: errorMessage
            } as JsonObject;
        }

        return {
            ...context,
            integrationResult: response as unknown as JsonObject
        } as JsonObject;
    }
}
