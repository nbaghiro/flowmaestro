/**
 * Plaid Integration Provider
 *
 * Banking and financial data platform with API Key authentication.
 * Supports accounts, balances, transactions, institutions, identity, and link tokens.
 *
 * Rate limit: ~100 requests/minute (conservative composite)
 */

import { BaseProvider } from "../../core/BaseProvider";
import { PlaidClient } from "./client/PlaidClient";
import { PlaidMCPAdapter } from "./mcp/PlaidMCPAdapter";
import {
    // Account Operations
    getAccountsOperation,
    executeGetAccounts,
    getBalancesOperation,
    executeGetBalances,
    // Transaction Operations
    getTransactionsOperation,
    executeGetTransactions,
    // Institution Operations
    getInstitutionOperation,
    executeGetInstitution,
    // Identity Operations
    getIdentityOperation,
    executeGetIdentity,
    // Link Operations
    createLinkTokenOperation,
    executeCreateLinkToken
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

export class PlaidProvider extends BaseProvider {
    readonly name = "plaid";
    readonly displayName = "Plaid";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 100,
            burstSize: 20
        }
    };

    private clientPool: Map<string, PlaidClient> = new Map();
    private mcpAdapter: PlaidMCPAdapter;

    constructor() {
        super();

        // Register Account Operations (2 operations)
        this.registerOperation(getAccountsOperation);
        this.registerOperation(getBalancesOperation);

        // Register Transaction Operations (1 operation)
        this.registerOperation(getTransactionsOperation);

        // Register Institution Operations (1 operation)
        this.registerOperation(getInstitutionOperation);

        // Register Identity Operations (1 operation)
        this.registerOperation(getIdentityOperation);

        // Register Link Operations (1 operation)
        this.registerOperation(createLinkTokenOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PlaidMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        const authConfig: APIKeyConfig = {
            headerName: "PLAID-CLIENT-ID",
            headerTemplate: "{{api_key}}"
        };

        return authConfig;
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
            // Account Operations
            case "getAccounts":
                return executeGetAccounts(client, params as never);
            case "getBalances":
                return executeGetBalances(client, params as never);

            // Transaction Operations
            case "getTransactions":
                return executeGetTransactions(client, params as never);

            // Institution Operations
            case "getInstitution":
                return executeGetInstitution(client, params as never);

            // Identity Operations
            case "getIdentity":
                return executeGetIdentity(client, params as never);

            // Link Operations
            case "createLinkToken":
                return executeCreateLinkToken(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): PlaidClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Plaid uses client_id (api_key) + secret (api_secret) pair
        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("Plaid client ID is required");
        }
        if (!data.api_secret) {
            throw new Error("Plaid secret is required");
        }

        const client = new PlaidClient({
            clientId: data.api_key,
            secret: data.api_secret,
            connectionId: connection.id,
            environment: "production"
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
