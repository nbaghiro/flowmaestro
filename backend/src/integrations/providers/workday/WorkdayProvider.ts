import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { WorkdayClient } from "./client/WorkdayClient";
import { WorkdayMCPAdapter } from "./mcp/WorkdayMCPAdapter";
import {
    listWorkersOperation,
    executeListWorkers,
    getWorkerOperation,
    executeGetWorker,
    listAbsenceBalancesOperation,
    executeListAbsenceBalances,
    requestTimeOffOperation,
    executeRequestTimeOff,
    getEligibleAbsenceTypesOperation,
    executeGetEligibleAbsenceTypes,
    listPayGroupsOperation,
    executeListPayGroups,
    getCompanyInfoOperation,
    executeGetCompanyInfo
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
 * Connection metadata interface for Workday
 */
interface WorkdayConnectionMetadata {
    tenant?: string;
}

/**
 * Workday Provider - implements OAuth2 authentication for HR management
 *
 * Workday uses tenant-specific URLs for both OAuth and API access.
 * The tenant identifier is collected via oauthSettings before OAuth initiation.
 */
export class WorkdayProvider extends BaseProvider {
    readonly name = "workday";
    readonly displayName = "Workday";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 100
        }
    };

    private mcpAdapter: WorkdayMCPAdapter;
    private clientPool: Map<string, WorkdayClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listWorkersOperation);
        this.registerOperation(getWorkerOperation);
        this.registerOperation(listAbsenceBalancesOperation);
        this.registerOperation(requestTimeOffOperation);
        this.registerOperation(getEligibleAbsenceTypesOperation);
        this.registerOperation(listPayGroupsOperation);
        this.registerOperation(getCompanyInfoOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new WorkdayMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     *
     * Note: Workday OAuth URLs are tenant-specific. The tenant is stored in
     * connection metadata and must be substituted at runtime.
     */
    getAuthConfig(): AuthConfig {
        // Default tenant placeholder - actual tenant comes from oauthSettings
        const defaultTenant = "TENANT";

        const config: OAuthConfig = {
            authUrl: `https://${defaultTenant}.workday.com/oauth2/${defaultTenant}/authorize`,
            tokenUrl: `https://${defaultTenant}.workday.com/ccx/oauth2/${defaultTenant}/token`,
            scopes: ["staffing", "system", "absenceManagement"],
            clientId: appConfig.oauth.workday.clientId,
            clientSecret: appConfig.oauth.workday.clientSecret,
            redirectUri: getOAuthRedirectUri("workday"),
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
            case "listAbsenceBalances":
                return await executeListAbsenceBalances(client, validatedParams as never);
            case "requestTimeOff":
                return await executeRequestTimeOff(client, validatedParams as never);
            case "getEligibleAbsenceTypes":
                return await executeGetEligibleAbsenceTypes(client, validatedParams as never);
            case "listPayGroups":
                return await executeListPayGroups(client, validatedParams as never);
            case "getCompanyInfo":
                return await executeGetCompanyInfo(client, validatedParams as never);
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
     * Get or create Workday client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): WorkdayClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tenant from connection metadata
        const metadata = connection.metadata as WorkdayConnectionMetadata | undefined;
        const tenant = metadata?.tenant;

        if (!tenant) {
            throw new Error(
                "Workday tenant not found in connection metadata. Please reconnect your Workday account."
            );
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new WorkdayClient({
            accessToken: tokens.access_token,
            tenant,
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
