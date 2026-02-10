import { BaseProvider } from "../../core/BaseProvider";
import { HiBobClient } from "./client/HiBobClient";
import { HiBobMCPAdapter } from "./mcp/HiBobMCPAdapter";
import {
    listEmployeesOperation,
    executeListEmployees,
    getEmployeeOperation,
    executeGetEmployee,
    searchEmployeesOperation,
    executeSearchEmployees,
    listTimeOffRequestsOperation,
    executeListTimeOffRequests,
    getTimeOffBalanceOperation,
    executeGetTimeOffBalance,
    createTimeOffRequestOperation,
    executeCreateTimeOffRequest,
    getWhosOutOperation,
    executeGetWhosOut,
    listTimeOffPoliciesOperation,
    executeListTimeOffPolicies
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
 * HiBob Provider - implements API Key authentication with HR operations
 *
 * Authentication uses Service User credentials from HiBob Settings > Integrations > Service Users
 * Format: serviceUserId:token
 *
 * API Documentation: https://apidocs.hibob.com/
 */
export class HiBobProvider extends BaseProvider {
    readonly name = "hibob";
    readonly displayName = "HiBob";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100
        }
    };

    private mcpAdapter: HiBobMCPAdapter;
    private clientPool: Map<string, HiBobClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listEmployeesOperation);
        this.registerOperation(getEmployeeOperation);
        this.registerOperation(searchEmployeesOperation);
        this.registerOperation(listTimeOffRequestsOperation);
        this.registerOperation(getTimeOffBalanceOperation);
        this.registerOperation(createTimeOffRequestOperation);
        this.registerOperation(getWhosOutOperation);
        this.registerOperation(listTimeOffPoliciesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HiBobMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     *
     * HiBob uses Service User credentials in format: serviceUserId:token
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{api_key}}"
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
            case "listEmployees":
                return await executeListEmployees(client, validatedParams as never);
            case "getEmployee":
                return await executeGetEmployee(client, validatedParams as never);
            case "searchEmployees":
                return await executeSearchEmployees(client, validatedParams as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, validatedParams as never);
            case "getTimeOffBalance":
                return await executeGetTimeOffBalance(client, validatedParams as never);
            case "createTimeOffRequest":
                return await executeCreateTimeOffRequest(client, validatedParams as never);
            case "getWhosOut":
                return await executeGetWhosOut(client, validatedParams as never);
            case "listTimeOffPolicies":
                return await executeListTimeOffPolicies(client, validatedParams as never);
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
     * Get or create HiBob client (with connection pooling)
     *
     * The API key format is: serviceUserId:token
     */
    private getOrCreateClient(connection: ConnectionWithData): HiBobClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Parse credentials from api_key (format: serviceUserId:token)
        const data = connection.data as ApiKeyData;
        const apiKey = data.api_key;

        const colonIndex = apiKey.indexOf(":");
        if (colonIndex === -1) {
            throw new Error(
                "Invalid HiBob credentials format. Expected 'serviceUserId:token'. Please check your Service User credentials in HiBob Settings > Integrations > Service Users."
            );
        }

        const serviceUserId = apiKey.substring(0, colonIndex);
        const token = apiKey.substring(colonIndex + 1);

        if (!serviceUserId || !token) {
            throw new Error(
                "Invalid HiBob credentials. Both Service User ID and Token are required."
            );
        }

        // Create new client
        const client = new HiBobClient({
            serviceUserId,
            token
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
