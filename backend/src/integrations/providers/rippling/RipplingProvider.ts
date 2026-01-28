import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { RipplingClient } from "./client/RipplingClient";
import { RipplingMCPAdapter } from "./mcp/RipplingMCPAdapter";
import {
    listEmployeesOperation,
    executeListEmployees,
    getEmployeeOperation,
    executeGetEmployee,
    listAllEmployeesOperation,
    executeListAllEmployees,
    listDepartmentsOperation,
    executeListDepartments,
    listTeamsOperation,
    executeListTeams,
    listWorkLocationsOperation,
    executeListWorkLocations,
    getCompanyOperation,
    executeGetCompany,
    listLeaveRequestsOperation,
    executeListLeaveRequests,
    getLeaveBalancesOperation,
    executeGetLeaveBalances,
    processLeaveRequestOperation,
    executeProcessLeaveRequest
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
 * Rippling Provider - implements OAuth2 authentication for HR and IT management
 */
export class RipplingProvider extends BaseProvider {
    readonly name = "rippling";
    readonly displayName = "Rippling";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 1000,
            burstSize: 100
        }
    };

    private mcpAdapter: RipplingMCPAdapter;
    private clientPool: Map<string, RipplingClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listEmployeesOperation);
        this.registerOperation(getEmployeeOperation);
        this.registerOperation(listAllEmployeesOperation);
        this.registerOperation(listDepartmentsOperation);
        this.registerOperation(listTeamsOperation);
        this.registerOperation(listWorkLocationsOperation);
        this.registerOperation(getCompanyOperation);
        this.registerOperation(listLeaveRequestsOperation);
        this.registerOperation(getLeaveBalancesOperation);
        this.registerOperation(processLeaveRequestOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new RipplingMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://api.rippling.com/o/authorize/",
            tokenUrl: "https://api.rippling.com/o/token/",
            scopes: [
                "employee:read",
                "department:read",
                "company:read",
                "leave_request:read",
                "leave_request:write"
            ],
            clientId: appConfig.oauth.rippling.clientId,
            clientSecret: appConfig.oauth.rippling.clientSecret,
            redirectUri: getOAuthRedirectUri("rippling"),
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
            case "listAllEmployees":
                return await executeListAllEmployees(client, validatedParams as never);
            case "listDepartments":
                return await executeListDepartments(client, validatedParams as never);
            case "listTeams":
                return await executeListTeams(client, validatedParams as never);
            case "listWorkLocations":
                return await executeListWorkLocations(client, validatedParams as never);
            case "getCompany":
                return await executeGetCompany(client, validatedParams as never);
            case "listLeaveRequests":
                return await executeListLeaveRequests(client, validatedParams as never);
            case "getLeaveBalances":
                return await executeGetLeaveBalances(client, validatedParams as never);
            case "processLeaveRequest":
                return await executeProcessLeaveRequest(client, validatedParams as never);
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
     * Get or create Rippling client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): RipplingClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new RipplingClient({
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
