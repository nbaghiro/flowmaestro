import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { getLogger } from "../../../core/logging";
import { BaseProvider } from "../../core/BaseProvider";
import { PipedriveClient } from "./client/PipedriveClient";
import { PipedriveMCPAdapter } from "./mcp/PipedriveMCPAdapter";
import {
    // Deal Operations
    listDealsOperation,
    executeListDeals,
    getDealOperation,
    executeGetDeal,
    createDealOperation,
    executeCreateDeal,
    updateDealOperation,
    executeUpdateDeal,
    deleteDealOperation,
    executeDeleteDeal,
    searchDealsOperation,
    executeSearchDeals,
    // Person Operations
    listPersonsOperation,
    executeListPersons,
    getPersonOperation,
    executeGetPerson,
    createPersonOperation,
    executeCreatePerson,
    updatePersonOperation,
    executeUpdatePerson,
    deletePersonOperation,
    executeDeletePerson,
    searchPersonsOperation,
    executeSearchPersons,
    // Organization Operations
    listOrganizationsOperation,
    executeListOrganizations,
    getOrganizationOperation,
    executeGetOrganization,
    createOrganizationOperation,
    executeCreateOrganization,
    updateOrganizationOperation,
    executeUpdateOrganization,
    deleteOrganizationOperation,
    executeDeleteOrganization,
    searchOrganizationsOperation,
    executeSearchOrganizations,
    // Lead Operations
    listLeadsOperation,
    executeListLeads,
    getLeadOperation,
    executeGetLead,
    createLeadOperation,
    executeCreateLead,
    updateLeadOperation,
    executeUpdateLead,
    deleteLeadOperation,
    executeDeleteLead,
    // Activity Operations
    listActivitiesOperation,
    executeListActivities,
    getActivityOperation,
    executeGetActivity,
    createActivityOperation,
    executeCreateActivity,
    updateActivityOperation,
    executeUpdateActivity,
    deleteActivityOperation,
    executeDeleteActivity
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

const logger = getLogger();

/**
 * Extended OAuth2 token data for Pipedrive
 * Pipedrive returns api_domain in the token response
 */
interface PipedriveOAuth2TokenData extends OAuth2TokenData {
    api_domain?: string;
}

/**
 * Pipedrive Provider
 *
 * Implements OAuth 2.0 authentication and provides operations for:
 * - Deals (sales pipeline management)
 * - Persons (contact management)
 * - Organizations (company management)
 * - Leads (leads inbox management)
 * - Activities (calls, meetings, tasks)
 *
 * Rate Limits:
 * - 10 requests per 2-second rolling window per token
 * - Daily token budget varies by plan
 *
 * Documentation: https://developers.pipedrive.com/docs/api/v1
 */
export class PipedriveProvider extends BaseProvider {
    readonly name = "pipedrive";
    readonly displayName = "Pipedrive";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 300, // Conservative: 5 req/s × 60s
            burstSize: 10
        }
    };

    private clientPool: Map<string, PipedriveClient> = new Map();
    private mcpAdapter: PipedriveMCPAdapter;

    constructor() {
        super();

        // Register Deal Operations (6 operations)
        this.registerOperation(listDealsOperation);
        this.registerOperation(getDealOperation);
        this.registerOperation(createDealOperation);
        this.registerOperation(updateDealOperation);
        this.registerOperation(deleteDealOperation);
        this.registerOperation(searchDealsOperation);

        // Register Person Operations (6 operations)
        this.registerOperation(listPersonsOperation);
        this.registerOperation(getPersonOperation);
        this.registerOperation(createPersonOperation);
        this.registerOperation(updatePersonOperation);
        this.registerOperation(deletePersonOperation);
        this.registerOperation(searchPersonsOperation);

        // Register Organization Operations (6 operations)
        this.registerOperation(listOrganizationsOperation);
        this.registerOperation(getOrganizationOperation);
        this.registerOperation(createOrganizationOperation);
        this.registerOperation(updateOrganizationOperation);
        this.registerOperation(deleteOrganizationOperation);
        this.registerOperation(searchOrganizationsOperation);

        // Register Lead Operations (5 operations)
        this.registerOperation(listLeadsOperation);
        this.registerOperation(getLeadOperation);
        this.registerOperation(createLeadOperation);
        this.registerOperation(updateLeadOperation);
        this.registerOperation(deleteLeadOperation);

        // Register Activity Operations (5 operations)
        this.registerOperation(listActivitiesOperation);
        this.registerOperation(getActivityOperation);
        this.registerOperation(createActivityOperation);
        this.registerOperation(updateActivityOperation);
        this.registerOperation(deleteActivityOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PipedriveMCPAdapter(this.operations);

        logger.info(
            { component: "PipedriveProvider", operationCount: this.operations.size },
            "Registered operations"
        );
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://oauth.pipedrive.com/oauth/authorize",
            tokenUrl: "https://oauth.pipedrive.com/oauth/token",
            scopes: [
                "base",
                "deals:full",
                "contacts:full",
                "organizations:full",
                "leads:full",
                "activities:full",
                "products:read"
            ],
            clientId: appConfig.oauth.pipedrive.clientId,
            clientSecret: appConfig.oauth.pipedrive.clientSecret,
            redirectUri: getOAuthRedirectUri("pipedrive"),
            refreshable: true
        };

        return config;
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
        return this.mcpAdapter.executeTool(toolName, params, client);
    }

    /**
     * Execute operation
     */
    async executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        // Route to appropriate operation executor
        switch (operation) {
            // Deal Operations
            case "listDeals":
                return executeListDeals(client, params as Parameters<typeof executeListDeals>[1]);
            case "getDeal":
                return executeGetDeal(client, params as Parameters<typeof executeGetDeal>[1]);
            case "createDeal":
                return executeCreateDeal(client, params as Parameters<typeof executeCreateDeal>[1]);
            case "updateDeal":
                return executeUpdateDeal(client, params as Parameters<typeof executeUpdateDeal>[1]);
            case "deleteDeal":
                return executeDeleteDeal(client, params as Parameters<typeof executeDeleteDeal>[1]);
            case "searchDeals":
                return executeSearchDeals(
                    client,
                    params as Parameters<typeof executeSearchDeals>[1]
                );

            // Person Operations
            case "listPersons":
                return executeListPersons(
                    client,
                    params as Parameters<typeof executeListPersons>[1]
                );
            case "getPerson":
                return executeGetPerson(client, params as Parameters<typeof executeGetPerson>[1]);
            case "createPerson":
                return executeCreatePerson(
                    client,
                    params as Parameters<typeof executeCreatePerson>[1]
                );
            case "updatePerson":
                return executeUpdatePerson(
                    client,
                    params as Parameters<typeof executeUpdatePerson>[1]
                );
            case "deletePerson":
                return executeDeletePerson(
                    client,
                    params as Parameters<typeof executeDeletePerson>[1]
                );
            case "searchPersons":
                return executeSearchPersons(
                    client,
                    params as Parameters<typeof executeSearchPersons>[1]
                );

            // Organization Operations
            case "listOrganizations":
                return executeListOrganizations(
                    client,
                    params as Parameters<typeof executeListOrganizations>[1]
                );
            case "getOrganization":
                return executeGetOrganization(
                    client,
                    params as Parameters<typeof executeGetOrganization>[1]
                );
            case "createOrganization":
                return executeCreateOrganization(
                    client,
                    params as Parameters<typeof executeCreateOrganization>[1]
                );
            case "updateOrganization":
                return executeUpdateOrganization(
                    client,
                    params as Parameters<typeof executeUpdateOrganization>[1]
                );
            case "deleteOrganization":
                return executeDeleteOrganization(
                    client,
                    params as Parameters<typeof executeDeleteOrganization>[1]
                );
            case "searchOrganizations":
                return executeSearchOrganizations(
                    client,
                    params as Parameters<typeof executeSearchOrganizations>[1]
                );

            // Lead Operations
            case "listLeads":
                return executeListLeads(client, params as Parameters<typeof executeListLeads>[1]);
            case "getLead":
                return executeGetLead(client, params as Parameters<typeof executeGetLead>[1]);
            case "createLead":
                return executeCreateLead(client, params as Parameters<typeof executeCreateLead>[1]);
            case "updateLead":
                return executeUpdateLead(client, params as Parameters<typeof executeUpdateLead>[1]);
            case "deleteLead":
                return executeDeleteLead(client, params as Parameters<typeof executeDeleteLead>[1]);

            // Activity Operations
            case "listActivities":
                return executeListActivities(
                    client,
                    params as Parameters<typeof executeListActivities>[1]
                );
            case "getActivity":
                return executeGetActivity(
                    client,
                    params as Parameters<typeof executeGetActivity>[1]
                );
            case "createActivity":
                return executeCreateActivity(
                    client,
                    params as Parameters<typeof executeCreateActivity>[1]
                );
            case "updateActivity":
                return executeUpdateActivity(
                    client,
                    params as Parameters<typeof executeUpdateActivity>[1]
                );
            case "deleteActivity":
                return executeDeleteActivity(
                    client,
                    params as Parameters<typeof executeDeleteActivity>[1]
                );

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operation}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get or create HTTP client for connection
     * Pipedrive returns api_domain in the OAuth token response
     */
    private getOrCreateClient(connection: ConnectionWithData): PipedriveClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const oauth2Data = connection.data as PipedriveOAuth2TokenData;
            if (!oauth2Data.access_token) {
                throw new Error("No access token found in connection data");
            }

            // Pipedrive returns api_domain in token response
            // Default to https://api.pipedrive.com if not present
            const apiDomain = oauth2Data.api_domain || "https://api.pipedrive.com";

            client = new PipedriveClient({
                accessToken: oauth2Data.access_token,
                apiDomain,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
            logger.info(
                { component: "PipedriveProvider", connectionId: connection.id, apiDomain },
                "Created new client for connection"
            );
        }

        return client;
    }

    /**
     * Clear cached client (e.g., after token refresh)
     */
    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
        logger.info(
            { component: "PipedriveProvider", connectionId },
            "Cleared client cache for connection"
        );
    }
}
