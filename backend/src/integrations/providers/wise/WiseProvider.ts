import { BaseProvider } from "../../core/BaseProvider";
import { WiseClient } from "./client/WiseClient";
import { WiseMCPAdapter } from "./mcp/WiseMCPAdapter";
// Profile operations
import {
    listBalancesOperation,
    executeListBalances,
    getBalanceOperation,
    executeGetBalance
} from "./operations/balances";
import {
    listProfilesOperation,
    executeListProfiles,
    getProfileOperation,
    executeGetProfile
} from "./operations/profiles";
// Balance operations
// Quote operations
import { createQuoteOperation, executeCreateQuote } from "./operations/quotes";
// Recipient operations
import {
    listRecipientsOperation,
    executeListRecipients,
    createRecipientOperation,
    executeCreateRecipient
} from "./operations/recipients";
// Transfer operations
import { createTransferOperation, executeCreateTransfer } from "./operations/transfers";
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
 * Wise Provider - implements API Key authentication with money transfer operations
 *
 * Wise uses Bearer token authentication:
 * - Personal API token generated from Wise account settings
 * - Authorization: Bearer {token}
 *
 * Rate limit: 100 requests/minute
 */
export class WiseProvider extends BaseProvider {
    readonly name = "wise";
    readonly displayName = "Wise";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100
        }
    };

    private mcpAdapter: WiseMCPAdapter;
    private clientPool: Map<string, WiseClient> = new Map();

    constructor() {
        super();

        // Register Profile operations
        this.registerOperation(listProfilesOperation);
        this.registerOperation(getProfileOperation);

        // Register Balance operations
        this.registerOperation(listBalancesOperation);
        this.registerOperation(getBalanceOperation);

        // Register Quote operations
        this.registerOperation(createQuoteOperation);

        // Register Recipient operations
        this.registerOperation(listRecipientsOperation);
        this.registerOperation(createRecipientOperation);

        // Register Transfer operations
        this.registerOperation(createTransferOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new WiseMCPAdapter(this.operations);
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
            // Profile operations
            case "listProfiles":
                return await executeListProfiles(client, validatedParams as never);
            case "getProfile":
                return await executeGetProfile(client, validatedParams as never);
            // Balance operations
            case "listBalances":
                return await executeListBalances(client, validatedParams as never);
            case "getBalance":
                return await executeGetBalance(client, validatedParams as never);
            // Quote operations
            case "createQuote":
                return await executeCreateQuote(client, validatedParams as never);
            // Recipient operations
            case "listRecipients":
                return await executeListRecipients(client, validatedParams as never);
            case "createRecipient":
                return await executeCreateRecipient(client, validatedParams as never);
            // Transfer operations
            case "createTransfer":
                return await executeCreateTransfer(client, validatedParams as never);
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
     * Get or create Wise client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): WiseClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new WiseClient({
            apiToken: data.api_key
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
