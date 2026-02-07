import { config, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { RampClient } from "./client/RampClient";
import { RampMCPAdapter } from "./mcp/RampMCPAdapter";
// Transaction operations
// Card operations
import {
    listCardsOperation,
    executeListCards,
    getCardOperation,
    executeGetCard
} from "./operations/cards";
// User operations
// Reimbursement operations
import {
    listReimbursementsOperation,
    executeListReimbursements
} from "./operations/reimbursements";
// Statement operations
import { listStatementsOperation, executeListStatements } from "./operations/statements";
import {
    listTransactionsOperation,
    executeListTransactions,
    getTransactionOperation,
    executeGetTransaction
} from "./operations/transactions";
import { listUsersOperation, executeListUsers } from "./operations/users";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Ramp Provider - implements OAuth2 authentication with expense management operations
 *
 * Ramp uses OAuth2 client credentials flow:
 * - Authorization URL: https://app.ramp.com/oauth/authorize
 * - Token URL: https://api.ramp.com/oauth/token
 * - Token expires after 10 days
 *
 * Rate limit: 100 requests/minute
 */
export class RampProvider extends BaseProvider {
    readonly name = "ramp";
    readonly displayName = "Ramp";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100
        }
    };

    private mcpAdapter: RampMCPAdapter;
    private clientPool: Map<string, RampClient> = new Map();

    constructor() {
        super();

        // Register Transaction operations
        this.registerOperation(listTransactionsOperation);
        this.registerOperation(getTransactionOperation);

        // Register Card operations
        this.registerOperation(listCardsOperation);
        this.registerOperation(getCardOperation);

        // Register User operations
        this.registerOperation(listUsersOperation);

        // Register Reimbursement operations
        this.registerOperation(listReimbursementsOperation);

        // Register Statement operations
        this.registerOperation(listStatementsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new RampMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://app.ramp.com/oauth/authorize",
            tokenUrl: "https://api.ramp.com/developer/v1/token",
            clientId: config.oauth.ramp.clientId,
            clientSecret: config.oauth.ramp.clientSecret,
            redirectUri: getOAuthRedirectUri("ramp"),
            scopes: [
                "transactions:read",
                "cards:read",
                "users:read",
                "reimbursements:read",
                "statements:read"
            ],
            refreshable: true
        };

        return oauthConfig;
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
            // Transaction operations
            case "listTransactions":
                return await executeListTransactions(client, validatedParams as never);
            case "getTransaction":
                return await executeGetTransaction(client, validatedParams as never);
            // Card operations
            case "listCards":
                return await executeListCards(client, validatedParams as never);
            case "getCard":
                return await executeGetCard(client, validatedParams as never);
            // User operations
            case "listUsers":
                return await executeListUsers(client, validatedParams as never);
            // Reimbursement operations
            case "listReimbursements":
                return await executeListReimbursements(client, validatedParams as never);
            // Statement operations
            case "listStatements":
                return await executeListStatements(client, validatedParams as never);
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
     * Get or create Ramp client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): RampClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new RampClient({
            accessToken: data.access_token
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
