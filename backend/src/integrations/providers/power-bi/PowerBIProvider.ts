import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { PowerBIClient } from "./client/PowerBIClient";
import {
    listWorkspacesOperation,
    executeListWorkspaces,
    listReportsOperation,
    executeListReports,
    getReportOperation,
    executeGetReport,
    exportReportOperation,
    executeExportReport,
    listDatasetsOperation,
    executeListDatasets,
    getDatasetOperation,
    executeGetDataset,
    refreshDatasetOperation,
    executeRefreshDataset,
    listDashboardsOperation,
    executeListDashboards,
    getDashboardOperation,
    executeGetDashboard
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookRequestData
} from "../../core/types";

/**
 * Power BI Provider - implements OAuth2 authentication with Power BI REST API
 *
 * ## Setup Instructions
 *
 * ### 1. Azure AD App Registration
 * Power BI uses the shared Microsoft OAuth client (MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET)
 * which should already be configured in Azure AD.
 *
 * ### 2. Required API Permissions
 * The Azure AD app needs these Power BI Service delegated permissions:
 * - Report.Read.All - Read all reports
 * - Dataset.Read.All - Read all datasets
 * - Dashboard.Read.All - Read all dashboards
 * - Workspace.Read.All - Read all workspaces
 *
 * ### 3. OAuth Scopes
 * Required scopes:
 * - User.Read - Read user profile
 * - https://analysis.windows.net/powerbi/api/Report.Read.All
 * - https://analysis.windows.net/powerbi/api/Dataset.Read.All
 * - https://analysis.windows.net/powerbi/api/Dashboard.Read.All
 * - https://analysis.windows.net/powerbi/api/Workspace.Read.All
 * - offline_access - For refresh tokens
 *
 * ### 4. Rate Limits
 * - Power BI API has quota limits per tenant
 * - Default: 600 tokens per minute
 * - Monitor usage in Azure Portal
 */
export class PowerBIProvider extends BaseProvider {
    readonly name = "power-bi";
    readonly displayName = "Power BI";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        supportsPolling: true,
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, PowerBIClient> = new Map();

    constructor() {
        super();

        // Register workspace operations
        this.registerOperation(listWorkspacesOperation);

        // Register report operations
        this.registerOperation(listReportsOperation);
        this.registerOperation(getReportOperation);
        this.registerOperation(exportReportOperation);

        // Register dataset operations
        this.registerOperation(listDatasetsOperation);
        this.registerOperation(getDatasetOperation);
        this.registerOperation(refreshDatasetOperation);

        // Register dashboard operations
        this.registerOperation(listDashboardsOperation);
        this.registerOperation(getDashboardOperation);

        // Configure webhook settings (polling-based, no webhooks support)
        this.setWebhookConfig({
            setupType: "polling",
            signatureType: "none"
        });
    }

    /**
     * Extract event type from webhook (not used)
     */
    override extractEventType(_request: WebhookRequestData): string | undefined {
        return undefined;
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scopes: [
                "User.Read",
                "https://analysis.windows.net/powerbi/api/Report.Read.All",
                "https://analysis.windows.net/powerbi/api/Dataset.Read.All",
                "https://analysis.windows.net/powerbi/api/Dashboard.Read.All",
                "https://analysis.windows.net/powerbi/api/Workspace.Read.All",
                "offline_access"
            ],
            clientId: appConfig.oauth.microsoft.clientId,
            clientSecret: appConfig.oauth.microsoft.clientSecret,
            redirectUri: getOAuthRedirectUri("microsoft"),
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
            // Workspace operations
            case "listWorkspaces":
                return await executeListWorkspaces(client, validatedParams as never);

            // Report operations
            case "listReports":
                return await executeListReports(client, validatedParams as never);
            case "getReport":
                return await executeGetReport(client, validatedParams as never);
            case "exportReport":
                return await executeExportReport(client, validatedParams as never);

            // Dataset operations
            case "listDatasets":
                return await executeListDatasets(client, validatedParams as never);
            case "getDataset":
                return await executeGetDataset(client, validatedParams as never);
            case "refreshDataset":
                return await executeRefreshDataset(client, validatedParams as never);

            // Dashboard operations
            case "listDashboards":
                return await executeListDashboards(client, validatedParams as never);
            case "getDashboard":
                return await executeGetDashboard(client, validatedParams as never);

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
        return this.getOperations().map((op) => ({
            name: `power_bi_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const operationId = toolName.replace("power_bi_", "");

        const result = await this.executeOperation(operationId, params, connection, {
            mode: "agent",
            conversationId: "unknown",
            toolCallId: "unknown"
        });

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Power BI client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): PowerBIClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new PowerBIClient({
            accessToken: data.access_token
        });

        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
