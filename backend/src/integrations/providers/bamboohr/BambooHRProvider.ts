import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { BambooHRClient } from "./client/BambooHRClient";
import { BambooHRMCPAdapter } from "./mcp/BambooHRMCPAdapter";
import {
    listEmployeesOperation,
    executeListEmployees,
    getEmployeeOperation,
    executeGetEmployee,
    getEmployeeDirectoryOperation,
    executeGetEmployeeDirectory,
    getCompanyInfoOperation,
    executeGetCompanyInfo,
    listTimeOffRequestsOperation,
    executeListTimeOffRequests,
    createTimeOffRequestOperation,
    executeCreateTimeOffRequest,
    getWhosOutOperation,
    executeGetWhosOut,
    listTimeOffPoliciesOperation,
    executeListTimeOffPolicies
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
 * Connection metadata interface for BambooHR
 */
interface BambooHRConnectionMetadata {
    companyDomain?: string;
}

/**
 * BambooHR Provider - implements OAuth2 authentication for HR management
 *
 * BambooHR uses company-domain-specific URLs for both OAuth and API access.
 * The company domain is collected via oauthSettings before OAuth initiation.
 */
export class BambooHRProvider extends BaseProvider {
    readonly name = "bamboohr";
    readonly displayName = "BambooHR";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 100
        }
    };

    private mcpAdapter: BambooHRMCPAdapter;
    private clientPool: Map<string, BambooHRClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listEmployeesOperation);
        this.registerOperation(getEmployeeOperation);
        this.registerOperation(getEmployeeDirectoryOperation);
        this.registerOperation(getCompanyInfoOperation);
        this.registerOperation(listTimeOffRequestsOperation);
        this.registerOperation(createTimeOffRequestOperation);
        this.registerOperation(getWhosOutOperation);
        this.registerOperation(listTimeOffPoliciesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new BambooHRMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     *
     * Note: BambooHR OAuth URLs are company-domain-specific. The domain is stored in
     * connection metadata and must be substituted at runtime.
     */
    getAuthConfig(): AuthConfig {
        // Default placeholder - actual company domain comes from oauthSettings
        const defaultDomain = "COMPANY_DOMAIN";

        const config: OAuthConfig = {
            authUrl: `https://${defaultDomain}.bamboohr.com/authorize.php`,
            tokenUrl: `https://${defaultDomain}.bamboohr.com/token.php`,
            scopes: ["offline_access"],
            clientId: appConfig.oauth.bamboohr.clientId,
            clientSecret: appConfig.oauth.bamboohr.clientSecret,
            redirectUri: getOAuthRedirectUri("bamboohr"),
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
            case "getEmployeeDirectory":
                return await executeGetEmployeeDirectory(client, validatedParams as never);
            case "getCompanyInfo":
                return await executeGetCompanyInfo(client, validatedParams as never);
            case "listTimeOffRequests":
                return await executeListTimeOffRequests(client, validatedParams as never);
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
     * Get or create BambooHR client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): BambooHRClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get company domain from connection metadata
        const metadata = connection.metadata as BambooHRConnectionMetadata | undefined;
        const companyDomain = metadata?.companyDomain;

        if (!companyDomain) {
            throw new Error(
                "BambooHR company domain not found in connection metadata. Please reconnect your BambooHR account."
            );
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new BambooHRClient({
            accessToken: tokens.access_token,
            companyDomain,
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
