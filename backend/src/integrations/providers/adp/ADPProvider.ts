import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ADPClient } from "./client/ADPClient";
import { ADPMCPAdapter } from "./mcp/ADPMCPAdapter";
import {
    listWorkersOperation,
    executeListWorkers,
    getWorkerOperation,
    executeGetWorker,
    listDepartmentsOperation,
    executeListDepartments,
    getCompanyInfoOperation,
    executeGetCompanyInfo,
    listTimeOffRequestsOperation,
    executeListTimeOffRequests,
    getTimeOffBalancesOperation,
    executeGetTimeOffBalances,
    createTimeOffRequestOperation,
    executeCreateTimeOffRequest,
    listPayStatementsOperation,
    executeListPayStatements
} from "./operations";
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
 * ADP Provider - implements OAuth2 authentication for HR and payroll management
 */
export class ADPProvider extends BaseProvider {
    readonly name = "adp";
    readonly displayName = "ADP";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 15
        }
    };

    private mcpAdapter: ADPMCPAdapter;
    private clientPool: Map<string, ADPClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listWorkersOperation);
        this.registerOperation(getWorkerOperation);
        this.registerOperation(listDepartmentsOperation);
        this.registerOperation(getCompanyInfoOperation);
        this.registerOperation(listTimeOffRequestsOperation);
        this.registerOperation(getTimeOffBalancesOperation);
        this.registerOperation(createTimeOffRequestOperation);
        this.registerOperation(listPayStatementsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ADPMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.adp.com/auth/oauth/v2/authorize",
            tokenUrl: "https://accounts.adp.com/auth/oauth/v2/token",
            scopes: ["api"],
            clientId: appConfig.oauth.adp.clientId,
            clientSecret: appConfig.oauth.adp.clientSecret,
            redirectUri: getOAuthRedirectUri("adp"),
            refreshable: true
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
            case "listWorkers":
                return await executeListWorkers(client, validatedParams as never);
            case "getWorker":
                return await executeGetWorker(client, validatedParams as never);
            case "listDepartments":
                return await executeListDepartments(client, validatedParams as never);
            case "getCompanyInfo":
                return await executeGetCompanyInfo(client, validatedParams as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, validatedParams as never);
            case "getTimeOffBalances":
                return await executeGetTimeOffBalances(client, validatedParams as never);
            case "createTimeOffRequest":
                return await executeCreateTimeOffRequest(client, validatedParams as never);
            case "listPayStatements":
                return await executeListPayStatements(client, validatedParams as never);
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
     * Get or create ADP client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ADPClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new ADPClient({
            accessToken: tokens.access_token,
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
