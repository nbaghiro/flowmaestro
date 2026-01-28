/**
 * QuickBooks Integration Provider
 *
 * Accounting and bookkeeping platform with OAuth2 authentication.
 * Supports customers, invoices, and company information.
 *
 * Rate limit: 500 requests/minute
 */

import { BaseProvider } from "../../core/BaseProvider";
import { QuickBooksClient } from "./client/QuickBooksClient";
import { QuickBooksMCPAdapter } from "./mcp/QuickBooksMCPAdapter";
import {
    // Customer Operations
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer,
    // Invoice Operations
    listInvoicesOperation,
    executeListInvoices,
    getInvoiceOperation,
    executeGetInvoice,
    createInvoiceOperation,
    executeCreateInvoice,
    // Company Operations
    getCompanyInfoOperation,
    executeGetCompanyInfo
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class QuickBooksProvider extends BaseProvider {
    readonly name = "quickbooks";
    readonly displayName = "QuickBooks";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 500,
            burstSize: 50
        }
    };

    private clientPool: Map<string, QuickBooksClient> = new Map();
    private mcpAdapter: QuickBooksMCPAdapter;

    constructor() {
        super();

        // Register Customer Operations (3 operations)
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);

        // Register Invoice Operations (3 operations)
        this.registerOperation(listInvoicesOperation);
        this.registerOperation(getInvoiceOperation);
        this.registerOperation(createInvoiceOperation);

        // Register Company Operations (1 operation)
        this.registerOperation(getCompanyInfoOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new QuickBooksMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {{access_token}}"
        };
    }

    /**
     * Execute an operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Customer Operations
            case "listCustomers":
                return executeListCustomers(client, params as never);
            case "getCustomer":
                return executeGetCustomer(client, params as never);
            case "createCustomer":
                return executeCreateCustomer(client, params as never);

            // Invoice Operations
            case "listInvoices":
                return executeListInvoices(client, params as never);
            case "getInvoice":
                return executeGetInvoice(client, params as never);
            case "createInvoice":
                return executeCreateInvoice(client, params as never);

            // Company Operations
            case "getCompanyInfo":
                return executeGetCompanyInfo(client, params as never);

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
     * Get MCP tools for AI agent integration
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create a client for a connection (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): QuickBooksClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get OAuth2 data from connection
        // QuickBooks stores realmId (company ID) in the token data
        const data = connection.data as OAuth2TokenData & {
            realm_id?: string;
            realmId?: string;
        };

        if (!data.access_token) {
            throw new Error("QuickBooks access token is required");
        }

        // QuickBooks requires realmId (company ID) for all API requests
        const realmId = data.realm_id || data.realmId;
        if (!realmId) {
            throw new Error("QuickBooks realmId (company ID) is required");
        }

        const client = new QuickBooksClient({
            accessToken: data.access_token,
            realmId: realmId,
            connectionId: connection.id,
            sandbox: false // Could be configured based on settings
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
