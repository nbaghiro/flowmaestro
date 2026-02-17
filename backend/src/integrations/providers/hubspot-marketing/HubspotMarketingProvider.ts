/**
 * HubSpot Marketing Provider
 *
 * Marketing automation provider for HubSpot, focused on:
 * - Contact lists and segments
 * - Marketing campaigns
 * - Forms and submissions
 * - Marketing emails
 * - Automation workflows
 *
 * Uses OAuth2 authentication (shared with HubSpot CRM).
 */

import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { HubspotMarketingClient } from "./client/HubspotMarketingClient";
import { HubspotMarketingMCPAdapter } from "./mcp/HubspotMarketingMCPAdapter";
import {
    // List Operations
    getListsOperation,
    executeGetLists,
    getListOperation,
    executeGetList,
    createListOperation,
    executeCreateList,
    addToListOperation,
    executeAddToList,
    removeFromListOperation,
    executeRemoveFromList,
    // Contact Operations
    getContactsOperation,
    executeGetContacts,
    getContactOperation,
    executeGetContact,
    createContactOperation,
    executeCreateContact,
    updateContactOperation,
    executeUpdateContact,
    deleteContactOperation,
    executeDeleteContact,
    searchContactsOperation,
    executeSearchContacts,
    // Campaign Operations
    getCampaignsOperation,
    executeGetCampaigns,
    getCampaignOperation,
    executeGetCampaign,
    // Form Operations
    getFormsOperation,
    executeGetForms,
    getFormSubmissionsOperation,
    executeGetFormSubmissions,
    // Email Operations
    getMarketingEmailsOperation,
    executeGetMarketingEmails,
    getEmailStatsOperation,
    executeGetEmailStats,
    // Workflow Operations
    getWorkflowsOperation,
    executeGetWorkflows
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OAuthConfig,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class HubspotMarketingProvider extends BaseProvider {
    readonly name = "hubspot-marketing";
    readonly displayName = "HubSpot Marketing";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 100,
            burstSize: 10
        }
    };

    private clientPool: Map<string, HubspotMarketingClient> = new Map();
    private mcpAdapter: HubspotMarketingMCPAdapter;

    constructor() {
        super();

        // Register List Operations
        this.registerOperation(getListsOperation);
        this.registerOperation(getListOperation);
        this.registerOperation(createListOperation);
        this.registerOperation(addToListOperation);
        this.registerOperation(removeFromListOperation);

        // Register Contact Operations
        this.registerOperation(getContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);
        this.registerOperation(searchContactsOperation);

        // Register Campaign Operations
        this.registerOperation(getCampaignsOperation);
        this.registerOperation(getCampaignOperation);

        // Register Form Operations
        this.registerOperation(getFormsOperation);
        this.registerOperation(getFormSubmissionsOperation);

        // Register Email Operations
        this.registerOperation(getMarketingEmailsOperation);
        this.registerOperation(getEmailStatsOperation);

        // Register Workflow Operations
        this.registerOperation(getWorkflowsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new HubspotMarketingMCPAdapter(this.operations);
    }

    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://app.hubspot.com/oauth/authorize",
            tokenUrl: "https://api.hubapi.com/oauth/v1/token",
            scopes: [
                // Contacts
                "crm.objects.contacts.read",
                "crm.objects.contacts.write",
                // Lists
                "crm.lists.read",
                "crm.lists.write",
                // Marketing
                "content",
                "forms",
                "automation"
            ],
            clientId: appConfig.oauth.hubspot.clientId,
            clientSecret: appConfig.oauth.hubspot.clientSecret,
            redirectUri: getOAuthRedirectUri("hubspot-marketing"),
            refreshable: true
        };
        return oauthConfig;
    }

    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getList":
                return executeGetList(client, params as never);
            case "createList":
                return executeCreateList(client, params as never);
            case "addToList":
                return executeAddToList(client, params as never);
            case "removeFromList":
                return executeRemoveFromList(client, params as never);

            // Contact Operations
            case "getContacts":
                return executeGetContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "deleteContact":
                return executeDeleteContact(client, params as never);
            case "searchContacts":
                return executeSearchContacts(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "getCampaign":
                return executeGetCampaign(client, params as never);

            // Form Operations
            case "getForms":
                return executeGetForms(client, params as never);
            case "getFormSubmissions":
                return executeGetFormSubmissions(client, params as never);

            // Email Operations
            case "getMarketingEmails":
                return executeGetMarketingEmails(client, params as never);
            case "getEmailStats":
                return executeGetEmailStats(client, params as never);

            // Workflow Operations
            case "getWorkflows":
                return executeGetWorkflows(client, params as never);

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

    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (!result.success) {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }

        return result.data;
    }

    private getOrCreateClient(connection: ConnectionWithData): HubspotMarketingClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error("HubSpot Marketing access token is required");
        }

        const client = new HubspotMarketingClient({
            accessToken: data.access_token,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }
}
