import { BaseProvider } from "../../core/BaseProvider";
import { DeelClient } from "./client/DeelClient";
import { DeelMCPAdapter } from "./mcp/DeelMCPAdapter";
import {
    listPeopleOperation,
    executeListPeople,
    getPersonOperation,
    executeGetPerson,
    listContractsOperation,
    executeListContracts,
    getContractOperation,
    executeGetContract,
    listTimeOffRequestsOperation,
    executeListTimeOffRequests,
    createTimeOffRequestOperation,
    executeCreateTimeOffRequest,
    getTimeOffBalanceOperation,
    executeGetTimeOffBalance,
    listTimesheetsOperation,
    executeListTimesheets
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
 * Deel Provider - implements API Key authentication for global HR and payroll
 */
export class DeelProvider extends BaseProvider {
    readonly name = "deel";
    readonly displayName = "Deel";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 1000,
            burstSize: 100
        }
    };

    private mcpAdapter: DeelMCPAdapter;
    private clientPool: Map<string, DeelClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listPeopleOperation);
        this.registerOperation(getPersonOperation);
        this.registerOperation(listContractsOperation);
        this.registerOperation(getContractOperation);
        this.registerOperation(listTimeOffRequestsOperation);
        this.registerOperation(createTimeOffRequestOperation);
        this.registerOperation(getTimeOffBalanceOperation);
        this.registerOperation(listTimesheetsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new DeelMCPAdapter(this.operations);
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
            case "listPeople":
                return await executeListPeople(client, validatedParams as never);
            case "getPerson":
                return await executeGetPerson(client, validatedParams as never);
            case "listContracts":
                return await executeListContracts(client, validatedParams as never);
            case "getContract":
                return await executeGetContract(client, validatedParams as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, validatedParams as never);
            case "createTimeOffRequest":
                return await executeCreateTimeOffRequest(client, validatedParams as never);
            case "getTimeOffBalance":
                return await executeGetTimeOffBalance(client, validatedParams as never);
            case "listTimesheets":
                return await executeListTimesheets(client, validatedParams as never);
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
     * Get or create Deel client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): DeelClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const apiKeyData = connection.data as ApiKeyData;
        const client = new DeelClient({
            accessToken: apiKeyData.api_key,
            connectionId: connection.id
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted or token refreshed)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
