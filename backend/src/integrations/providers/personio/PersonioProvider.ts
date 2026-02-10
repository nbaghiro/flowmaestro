import { BaseProvider } from "../../core/BaseProvider";
import { PersonioClient } from "./client/PersonioClient";
import { PersonioMCPAdapter } from "./mcp/PersonioMCPAdapter";
import {
    listEmployeesOperation,
    executeListEmployees,
    getEmployeeOperation,
    executeGetEmployee,
    createEmployeeOperation,
    executeCreateEmployee,
    updateEmployeeOperation,
    executeUpdateEmployee,
    listAbsencesOperation,
    executeListAbsences,
    createAbsenceOperation,
    executeCreateAbsence,
    getAbsenceBalanceOperation,
    executeGetAbsenceBalance,
    listAttendancesOperation,
    executeListAttendances,
    createAttendanceOperation,
    executeCreateAttendance
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
 * Personio Provider - implements API Key authentication with HR operations
 *
 * Authentication uses Client Credentials (OAuth 2.0) via API key format:
 * Format: clientId:clientSecret
 *
 * The client automatically handles token management (tokens last 24 hours).
 *
 * API Documentation: https://developer.personio.de/
 */
export class PersonioProvider extends BaseProvider {
    readonly name = "personio";
    readonly displayName = "Personio";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 300
        }
    };

    private mcpAdapter: PersonioMCPAdapter;
    private clientPool: Map<string, PersonioClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listEmployeesOperation);
        this.registerOperation(getEmployeeOperation);
        this.registerOperation(createEmployeeOperation);
        this.registerOperation(updateEmployeeOperation);
        this.registerOperation(listAbsencesOperation);
        this.registerOperation(createAbsenceOperation);
        this.registerOperation(getAbsenceBalanceOperation);
        this.registerOperation(listAttendancesOperation);
        this.registerOperation(createAttendanceOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PersonioMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     *
     * Personio uses Client ID and Client Secret in format: clientId:clientSecret
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
            case "listEmployees":
                return await executeListEmployees(client, validatedParams as never);
            case "getEmployee":
                return await executeGetEmployee(client, validatedParams as never);
            case "createEmployee":
                return await executeCreateEmployee(client, validatedParams as never);
            case "updateEmployee":
                return await executeUpdateEmployee(client, validatedParams as never);
            case "listAbsences":
                return await executeListAbsences(client, validatedParams as never);
            case "createAbsence":
                return await executeCreateAbsence(client, validatedParams as never);
            case "getAbsenceBalance":
                return await executeGetAbsenceBalance(client, validatedParams as never);
            case "listAttendances":
                return await executeListAttendances(client, validatedParams as never);
            case "createAttendance":
                return await executeCreateAttendance(client, validatedParams as never);
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
     * Get or create Personio client (with connection pooling)
     *
     * The API key format is: clientId:clientSecret
     */
    private getOrCreateClient(connection: ConnectionWithData): PersonioClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Parse credentials from api_key (format: clientId:clientSecret)
        const data = connection.data as ApiKeyData;
        const apiKey = data.api_key;

        const colonIndex = apiKey.indexOf(":");
        if (colonIndex === -1) {
            throw new Error(
                "Invalid Personio credentials format. Expected 'clientId:clientSecret'. Please check your API Credentials in Personio Settings."
            );
        }

        const clientId = apiKey.substring(0, colonIndex);
        const clientSecret = apiKey.substring(colonIndex + 1);

        if (!clientId || !clientSecret) {
            throw new Error(
                "Invalid Personio credentials. Both Client ID and Client Secret are required."
            );
        }

        // Create new client
        const client = new PersonioClient({
            clientId,
            clientSecret
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
