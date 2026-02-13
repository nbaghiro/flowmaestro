import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { SAPSuccessFactorsClient } from "./client/SAPSuccessFactorsClient";
import { SAPSuccessFactorsMCPAdapter } from "./mcp/SAPSuccessFactorsMCPAdapter";
import {
    listEmployeesOperation,
    executeListEmployees,
    getEmployeeOperation,
    executeGetEmployee,
    listDepartmentsOperation,
    executeListDepartments,
    listTimeOffRequestsOperation,
    executeListTimeOffRequests,
    getTimeOffBalanceOperation,
    executeGetTimeOffBalance,
    listJobsOperation,
    executeListJobs
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
 * SAP SuccessFactors Provider - implements OAuth2 authentication for enterprise HCM
 */
export class SAPSuccessFactorsProvider extends BaseProvider {
    readonly name = "sap-successfactors";
    readonly displayName = "SAP SuccessFactors";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 500,
            burstSize: 50
        }
    };

    private mcpAdapter: SAPSuccessFactorsMCPAdapter;
    private clientPool: Map<string, SAPSuccessFactorsClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listEmployeesOperation);
        this.registerOperation(getEmployeeOperation);
        this.registerOperation(listDepartmentsOperation);
        this.registerOperation(listTimeOffRequestsOperation);
        this.registerOperation(getTimeOffBalanceOperation);
        this.registerOperation(listJobsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SAPSuccessFactorsMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     * Note: SAP SuccessFactors uses dynamic API server URLs
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://{{apiServer}}/oauth/authorize",
            tokenUrl: "https://{{apiServer}}/oauth/token",
            scopes: ["user"],
            clientId: appConfig.oauth.sapSuccessFactors.clientId,
            clientSecret: appConfig.oauth.sapSuccessFactors.clientSecret,
            redirectUri: getOAuthRedirectUri("sap-successfactors"),
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
            case "listEmployees":
                return await executeListEmployees(client, validatedParams as never);
            case "getEmployee":
                return await executeGetEmployee(client, validatedParams as never);
            case "listDepartments":
                return await executeListDepartments(client, validatedParams as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, validatedParams as never);
            case "getTimeOffBalance":
                return await executeGetTimeOffBalance(client, validatedParams as never);
            case "listJobs":
                return await executeListJobs(client, validatedParams as never);
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
     * Get or create SAP SuccessFactors client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): SAPSuccessFactorsClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;

        // Get API server from connection settings or token data
        const apiServer = this.getApiServer(connection);

        const client = new SAPSuccessFactorsClient({
            accessToken: tokens.access_token,
            apiServer,
            connectionId: connection.id
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Extract API server from connection
     */
    private getApiServer(connection: ConnectionWithData): string {
        // Check provider_config in metadata (set during OAuth flow)
        const providerConfig = connection.metadata?.provider_config;
        if (providerConfig?.apiServer && typeof providerConfig.apiServer === "string") {
            return providerConfig.apiServer;
        }

        // Check account_info in metadata as fallback
        const accountInfo = connection.metadata?.account_info;
        if (accountInfo?.apiServer && typeof accountInfo.apiServer === "string") {
            return accountInfo.apiServer;
        }

        // Check token data for API server hint
        const tokenData = connection.data as OAuth2TokenData & { api_server?: string };
        if (tokenData.api_server) {
            return tokenData.api_server;
        }

        // Default to common API server (user should have configured this)
        throw new Error(
            "SAP SuccessFactors API server not configured. Please reconnect with the correct API server URL."
        );
    }

    /**
     * Clear client from pool (e.g., when connection is deleted or token refreshed)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
