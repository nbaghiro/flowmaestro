import { BaseProvider } from "../../core/BaseProvider";
import { LatticeClient } from "./client/LatticeClient";
import { LatticeMCPAdapter } from "./mcp/LatticeMCPAdapter";
import {
    listUsersOperation,
    executeListUsers,
    getUserOperation,
    executeGetUser,
    listGoalsOperation,
    executeListGoals,
    getGoalOperation,
    executeGetGoal,
    createGoalOperation,
    executeCreateGoal,
    updateGoalOperation,
    executeUpdateGoal,
    listReviewCyclesOperation,
    executeListReviewCycles,
    listDepartmentsOperation,
    executeListDepartments
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Lattice Provider - implements API Key authentication for performance and engagement
 */
export class LatticeProvider extends BaseProvider {
    readonly name = "lattice";
    readonly displayName = "Lattice";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 100
        }
    };

    private mcpAdapter: LatticeMCPAdapter;
    private clientPool: Map<string, LatticeClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listUsersOperation);
        this.registerOperation(getUserOperation);
        this.registerOperation(listGoalsOperation);
        this.registerOperation(getGoalOperation);
        this.registerOperation(createGoalOperation);
        this.registerOperation(updateGoalOperation);
        this.registerOperation(listReviewCyclesOperation);
        this.registerOperation(listDepartmentsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new LatticeMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
        };

        return config;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            case "listUsers":
                return await executeListUsers(client, validatedParams as never);
            case "getUser":
                return await executeGetUser(client, validatedParams as never);
            case "listGoals":
                return await executeListGoals(client, validatedParams as never);
            case "getGoal":
                return await executeGetGoal(client, validatedParams as never);
            case "createGoal":
                return await executeCreateGoal(client, validatedParams as never);
            case "updateGoal":
                return await executeUpdateGoal(client, validatedParams as never);
            case "listReviewCycles":
                return await executeListReviewCycles(client, validatedParams as never);
            case "listDepartments":
                return await executeListDepartments(client, validatedParams as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create Lattice client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): LatticeClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new LatticeClient({
            apiKey: data.api_key
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
