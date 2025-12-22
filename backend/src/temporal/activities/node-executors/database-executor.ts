import type { JsonObject } from "@flowmaestro/shared";
import { providerRegistry } from "../../../integrations/registry";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import type { ExecutionContext } from "../../../integrations/core/types";

export interface DatabaseNodeConfig {
    // Integration connection ID (required)
    connectionId: string;

    // Provider type (postgresql, mysql, mongodb)
    provider: "postgresql" | "mysql" | "mongodb";

    // Operation to perform
    // SQL operations (postgresql, mysql)
    // MongoDB operations
    operation:
        | "query"
        | "insert"
        | "update"
        | "delete"
        | "listTables"
        | "find"
        | "insertOne"
        | "insertMany"
        | "updateOne"
        | "updateMany"
        | "deleteOne"
        | "deleteMany"
        | "listCollections"
        | "aggregate";

    // Operation parameters (varies by operation)
    parameters: Record<string, unknown>;

    // Output configuration
    outputVariable?: string;

    // Legacy fields for backward compatibility (deprecated)
    databaseConnectionId?: string;
    databaseType?: "postgresql" | "mysql" | "mongodb";
}

export interface DatabaseNodeResult {
    operation: string;
    provider: string;
    success: boolean;
    data?: unknown;
    error?: {
        type: string;
        message: string;
    };
    metadata?: {
        queryTime: number;
    };
}

/**
 * Execute Database node using the provider system
 */
export async function executeDatabaseNode(
    config: DatabaseNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    // Handle backward compatibility
    const connectionId = config.connectionId || config.databaseConnectionId;
    const provider = config.provider || config.databaseType;

    if (!connectionId) {
        throw new Error(
            "connectionId is required. Please select a database connection from the dropdown."
        );
    }

    if (!provider) {
        throw new Error("provider is required. Please specify the database type.");
    }

    console.log(`[Database] Provider: ${provider}, Operation: ${config.operation}`);

    try {
        // Fetch connection with decrypted credentials
        const connectionRepo = new ConnectionRepository();
        const connection = await connectionRepo.findByIdWithData(connectionId);

        if (!connection) {
            throw new Error(`Connection not found: ${connectionId}`);
        }

        // Verify connection provider matches
        if (connection.provider !== provider) {
            throw new Error(
                `Connection provider mismatch: expected ${provider}, got ${connection.provider}`
            );
        }

        // Verify connection is active
        if (connection.status !== "active") {
            throw new Error(
                `Connection is not active (status: ${connection.status}). Please test and reactivate the connection.`
            );
        }

        // Get provider instance
        const providerInstance = await providerRegistry.getProvider(provider);
        if (!providerInstance) {
            throw new Error(`Provider not found: ${provider}`);
        }

        // Build execution context
        const executionContext: ExecutionContext = {
            mode: "workflow",
            workflowId: (context.workflowId as string) || "",
            nodeId: (config.parameters?.nodeId as string) || ""
        };

        // Execute operation via provider
        const result = await providerInstance.executeOperation(
            config.operation,
            config.parameters,
            connection,
            executionContext
        );

        const queryTime = Date.now() - startTime;

        console.log(`[Database] Completed in ${queryTime}ms`);

        // Mark connection as used
        await connectionRepo.markAsUsed(connectionId);

        // Format result
        const formattedResult: DatabaseNodeResult = {
            operation: config.operation,
            provider: provider,
            success: result.success,
            data: result.data,
            error: result.error,
            metadata: {
                queryTime
            }
        };

        // Return with output variable if specified
        if (config.outputVariable) {
            return {
                [config.outputVariable]: formattedResult.data || formattedResult
            } as unknown as JsonObject;
        }

        return formattedResult as unknown as JsonObject;
    } catch (error) {
        const queryTime = Date.now() - startTime;

        console.error(`[Database] Error after ${queryTime}ms:`, error);

        const errorResult: DatabaseNodeResult = {
            operation: config.operation,
            provider: provider,
            success: false,
            error: {
                type: "execution_error",
                message: error instanceof Error ? error.message : "Unknown error occurred"
            },
            metadata: {
                queryTime
            }
        };

        // If outputVariable is specified, throw error so workflow can handle it
        if (config.outputVariable) {
            throw error;
        }

        return errorResult as unknown as JsonObject;
    }
}

/**
 * Clean up all database connections (call on shutdown)
 * Note: With the provider system, cleanup is handled by individual providers
 */
export async function closeDatabaseConnections(): Promise<void> {
    console.log("[Database] Connection cleanup handled by provider system");
    // TODO: Implement provider cleanup registry if needed
}
