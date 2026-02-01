/**
 * FreshBooks Integration Provider
 *
 * Small business accounting software with OAuth2 authentication.
 * Supports clients, invoices, and expenses.
 *
 * Rate limit: 1000 requests/minute
 */

import { BaseProvider } from "../../core/BaseProvider";
import { FreshBooksHttpClient } from "./client/FreshBooksClient";
import { FreshBooksMCPAdapter } from "./mcp/FreshBooksMCPAdapter";
import {
    // User Operations
    getMeOperation,
    executeGetMe,
    // Client Operations
    listClientsOperation,
    executeListClients,
    createClientOperation,
    executeCreateClient,
    // Invoice Operations
    listInvoicesOperation,
    executeListInvoices,
    getInvoiceOperation,
    executeGetInvoice,
    createInvoiceOperation,
    executeCreateInvoice,
    // Expense Operations
    listExpensesOperation,
    executeListExpenses
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class FreshBooksProvider extends BaseProvider {
    readonly name = "freshbooks";
    readonly displayName = "FreshBooks";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 1000,
            burstSize: 100
        }
    };

    private clientPool: Map<string, FreshBooksHttpClient> = new Map();
    private mcpAdapter: FreshBooksMCPAdapter;

    constructor() {
        super();

        // Register User Operations (1 operation)
        this.registerOperation(getMeOperation);

        // Register Client Operations (2 operations)
        this.registerOperation(listClientsOperation);
        this.registerOperation(createClientOperation);

        // Register Invoice Operations (3 operations)
        this.registerOperation(listInvoicesOperation);
        this.registerOperation(getInvoiceOperation);
        this.registerOperation(createInvoiceOperation);

        // Register Expense Operations (1 operation)
        this.registerOperation(listExpensesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new FreshBooksMCPAdapter(this.operations);
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
            // User Operations
            case "getMe":
                return executeGetMe(client, params as never);

            // Client Operations
            case "listClients":
                return executeListClients(client, params as never);
            case "createClient":
                return executeCreateClient(client, params as never);

            // Invoice Operations
            case "listInvoices":
                return executeListInvoices(client, params as never);
            case "getInvoice":
                return executeGetInvoice(client, params as never);
            case "createInvoice":
                return executeCreateInvoice(client, params as never);

            // Expense Operations
            case "listExpenses":
                return executeListExpenses(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): FreshBooksHttpClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get OAuth2 data from connection
        // FreshBooks stores accountId in the token data
        const data = connection.data as OAuth2TokenData & {
            account_id?: string;
            accountId?: string;
        };

        if (!data.access_token) {
            throw new Error("FreshBooks access token is required");
        }

        // FreshBooks requires accountId for accounting API requests
        const accountId = data.account_id || data.accountId;
        if (!accountId) {
            throw new Error("FreshBooks accountId is required");
        }

        const client = new FreshBooksHttpClient({
            accessToken: data.access_token,
            accountId: accountId,
            connectionId: connection.id
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
