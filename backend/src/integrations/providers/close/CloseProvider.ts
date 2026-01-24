import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { getLogger } from "../../../core/logging";
import { BaseProvider } from "../../core/BaseProvider";
import { CloseClient } from "./client/CloseClient";
import { CloseMCPAdapter } from "./mcp/CloseMCPAdapter";
import {
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
    searchLeadsOperation,
    executeSearchLeads,
    // Contact Operations
    listContactsOperation,
    executeListContacts,
    getContactOperation,
    executeGetContact,
    createContactOperation,
    executeCreateContact,
    updateContactOperation,
    executeUpdateContact,
    deleteContactOperation,
    executeDeleteContact,
    // Opportunity Operations
    listOpportunitiesOperation,
    executeListOpportunities,
    getOpportunityOperation,
    executeGetOpportunity,
    createOpportunityOperation,
    executeCreateOpportunity,
    updateOpportunityOperation,
    executeUpdateOpportunity,
    deleteOpportunityOperation,
    executeDeleteOpportunity,
    // Activity Operations
    listActivitiesOperation,
    executeListActivities,
    createNoteOperation,
    executeCreateNote,
    createTaskOperation,
    executeCreateTask,
    completeTaskOperation,
    executeCompleteTask,
    // Communication Operations
    sendEmailOperation,
    executeSendEmail,
    logCallOperation,
    executeLogCall
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
 * Close CRM Provider
 *
 * Implements OAuth 2.0 authentication and provides operations for:
 * - Leads (company/organization management)
 * - Contacts (people at leads)
 * - Opportunities (deals/revenue tracking)
 * - Activities (calls, emails, notes, meetings)
 * - Communication (send emails, log calls)
 *
 * Rate Limits:
 * - Lead POSTs: 40 requests per second
 * - Reports GETs: 10 requests per second
 * - Organization limit: 3× individual API key limits
 *
 * Documentation: https://developer.close.com/
 */
export class CloseProvider extends BaseProvider {
    readonly name = "close";
    readonly displayName = "Close";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600, // Conservative: 10 req/s × 60s
            burstSize: 40
        }
    };

    private clientPool: Map<string, CloseClient> = new Map();
    private mcpAdapter: CloseMCPAdapter;

    constructor() {
        super();

        // Register Lead Operations (6 operations)
        this.registerOperation(listLeadsOperation);
        this.registerOperation(getLeadOperation);
        this.registerOperation(createLeadOperation);
        this.registerOperation(updateLeadOperation);
        this.registerOperation(deleteLeadOperation);
        this.registerOperation(searchLeadsOperation);

        // Register Contact Operations (5 operations)
        this.registerOperation(listContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);

        // Register Opportunity Operations (5 operations)
        this.registerOperation(listOpportunitiesOperation);
        this.registerOperation(getOpportunityOperation);
        this.registerOperation(createOpportunityOperation);
        this.registerOperation(updateOpportunityOperation);
        this.registerOperation(deleteOpportunityOperation);

        // Register Activity Operations (4 operations)
        this.registerOperation(listActivitiesOperation);
        this.registerOperation(createNoteOperation);
        this.registerOperation(createTaskOperation);
        this.registerOperation(completeTaskOperation);

        // Register Communication Operations (2 operations)
        this.registerOperation(sendEmailOperation);
        this.registerOperation(logCallOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new CloseMCPAdapter(this.operations);

        logger.info(
            { component: "CloseProvider", operationCount: this.operations.size },
            "Registered operations"
        );
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.close.com/oauth2/authorize/",
            tokenUrl: "https://api.close.com/oauth2/token/",
            scopes: ["all.full_access", "offline_access"],
            clientId: appConfig.oauth.close.clientId,
            clientSecret: appConfig.oauth.close.clientSecret,
            redirectUri: getOAuthRedirectUri("close"),
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
            case "searchLeads":
                return executeSearchLeads(
                    client,
                    params as Parameters<typeof executeSearchLeads>[1]
                );

            // Contact Operations
            case "listContacts":
                return executeListContacts(
                    client,
                    params as Parameters<typeof executeListContacts>[1]
                );
            case "getContact":
                return executeGetContact(client, params as Parameters<typeof executeGetContact>[1]);
            case "createContact":
                return executeCreateContact(
                    client,
                    params as Parameters<typeof executeCreateContact>[1]
                );
            case "updateContact":
                return executeUpdateContact(
                    client,
                    params as Parameters<typeof executeUpdateContact>[1]
                );
            case "deleteContact":
                return executeDeleteContact(
                    client,
                    params as Parameters<typeof executeDeleteContact>[1]
                );

            // Opportunity Operations
            case "listOpportunities":
                return executeListOpportunities(
                    client,
                    params as Parameters<typeof executeListOpportunities>[1]
                );
            case "getOpportunity":
                return executeGetOpportunity(
                    client,
                    params as Parameters<typeof executeGetOpportunity>[1]
                );
            case "createOpportunity":
                return executeCreateOpportunity(
                    client,
                    params as Parameters<typeof executeCreateOpportunity>[1]
                );
            case "updateOpportunity":
                return executeUpdateOpportunity(
                    client,
                    params as Parameters<typeof executeUpdateOpportunity>[1]
                );
            case "deleteOpportunity":
                return executeDeleteOpportunity(
                    client,
                    params as Parameters<typeof executeDeleteOpportunity>[1]
                );

            // Activity Operations
            case "listActivities":
                return executeListActivities(
                    client,
                    params as Parameters<typeof executeListActivities>[1]
                );
            case "createNote":
                return executeCreateNote(client, params as Parameters<typeof executeCreateNote>[1]);
            case "createTask":
                return executeCreateTask(client, params as Parameters<typeof executeCreateTask>[1]);
            case "completeTask":
                return executeCompleteTask(
                    client,
                    params as Parameters<typeof executeCompleteTask>[1]
                );

            // Communication Operations
            case "sendEmail":
                return executeSendEmail(client, params as Parameters<typeof executeSendEmail>[1]);
            case "logCall":
                return executeLogCall(client, params as Parameters<typeof executeLogCall>[1]);

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
     */
    private getOrCreateClient(connection: ConnectionWithData): CloseClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const oauth2Data = connection.data as OAuth2TokenData;
            if (!oauth2Data.access_token) {
                throw new Error("No access token found in connection data");
            }

            client = new CloseClient({
                accessToken: oauth2Data.access_token,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
            logger.info(
                { component: "CloseProvider", connectionId: connection.id },
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
            { component: "CloseProvider", connectionId },
            "Cleared client cache for connection"
        );
    }
}
