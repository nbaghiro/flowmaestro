import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GustoClient } from "./client/GustoClient";
import { GustoMCPAdapter } from "./mcp/GustoMCPAdapter";
import {
    listEmployeesOperation,
    executeListEmployees,
    getEmployeeOperation,
    executeGetEmployee,
    getCompanyOperation,
    executeGetCompany,
    listDepartmentsOperation,
    executeListDepartments,
    listPayrollsOperation,
    executeListPayrolls,
    listTimeOffActivitiesOperation,
    executeListTimeOffActivities,
    listLocationsOperation,
    executeListLocations,
    listBenefitsOperation,
    executeListBenefits
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
 * Gusto Provider - implements OAuth2 authentication for payroll and HR management
 */
export class GustoProvider extends BaseProvider {
    readonly name = "gusto";
    readonly displayName = "Gusto";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 200,
            burstSize: 20
        }
    };

    private mcpAdapter: GustoMCPAdapter;
    private clientPool: Map<string, GustoClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listEmployeesOperation);
        this.registerOperation(getEmployeeOperation);
        this.registerOperation(getCompanyOperation);
        this.registerOperation(listDepartmentsOperation);
        this.registerOperation(listPayrollsOperation);
        this.registerOperation(listTimeOffActivitiesOperation);
        this.registerOperation(listLocationsOperation);
        this.registerOperation(listBenefitsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new GustoMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://api.gusto.com/oauth/authorize",
            tokenUrl: "https://api.gusto.com/oauth/token",
            scopes: ["employees:read", "companies:read", "payrolls:read", "benefits:read"],
            clientId: appConfig.oauth.gusto.clientId,
            clientSecret: appConfig.oauth.gusto.clientSecret,
            redirectUri: getOAuthRedirectUri("gusto"),
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
            case "getCompany":
                return await executeGetCompany(client, validatedParams as never);
            case "listDepartments":
                return await executeListDepartments(client, validatedParams as never);
            case "listPayrolls":
                return await executeListPayrolls(client, validatedParams as never);
            case "listTimeOffActivities":
                return await executeListTimeOffActivities(client, validatedParams as never);
            case "listLocations":
                return await executeListLocations(client, validatedParams as never);
            case "listBenefits":
                return await executeListBenefits(client, validatedParams as never);
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
     * Get or create Gusto client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GustoClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new GustoClient({
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
