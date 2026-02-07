import { BaseProvider } from "../../core/BaseProvider";
import { ExpensifyClient } from "./client/ExpensifyClient";
import { ExpensifyMCPAdapter } from "./mcp/ExpensifyMCPAdapter";
// Report operations
import { manageEmployeesOperation, executeManageEmployees } from "./operations/employees";
import { createExpenseOperation, executeCreateExpense } from "./operations/expenses";
import {
    listPoliciesOperation,
    executeListPolicies,
    updatePolicyOperation,
    executeUpdatePolicy
} from "./operations/policies";
import {
    exportReportsOperation,
    executeExportReports,
    getReportOperation,
    executeGetReport
} from "./operations/reports";
// Expense operations
// Policy operations
// Employee operations
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
 * Expensify Provider - implements API Key authentication with expense management operations
 *
 * Expensify uses a unique job-based API:
 * - All requests are POST to single endpoint
 * - Authentication via partnerUserID and partnerUserSecret in request body
 * - partnerUserID stored in api_key, partnerUserSecret in api_secret
 *
 * Rate limit: 50 requests/minute
 */
export class ExpensifyProvider extends BaseProvider {
    readonly name = "expensify";
    readonly displayName = "Expensify";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 50
        }
    };

    private mcpAdapter: ExpensifyMCPAdapter;
    private clientPool: Map<string, ExpensifyClient> = new Map();

    constructor() {
        super();

        // Register Report operations
        this.registerOperation(exportReportsOperation);
        this.registerOperation(getReportOperation);

        // Register Expense operations
        this.registerOperation(createExpenseOperation);

        // Register Policy operations
        this.registerOperation(listPoliciesOperation);
        this.registerOperation(updatePolicyOperation);

        // Register Employee operations
        this.registerOperation(manageEmployeesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ExpensifyMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "X-Expensify-PartnerUserID",
            headerTemplate: "{{api_key}}"
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
            // Report operations
            case "exportReports":
                return await executeExportReports(client, validatedParams as never);
            case "getReport":
                return await executeGetReport(client, validatedParams as never);
            // Expense operations
            case "createExpense":
                return await executeCreateExpense(client, validatedParams as never);
            // Policy operations
            case "listPolicies":
                return await executeListPolicies(client, validatedParams as never);
            case "updatePolicy":
                return await executeUpdatePolicy(client, validatedParams as never);
            // Employee operations
            case "manageEmployees":
                return await executeManageEmployees(client, validatedParams as never);
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
     * Get or create Expensify client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ExpensifyClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new ExpensifyClient({
            partnerUserID: data.api_key,
            partnerUserSecret: data.api_secret || ""
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
