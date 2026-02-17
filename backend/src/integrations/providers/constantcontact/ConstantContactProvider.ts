/**
 * Constant Contact Provider
 *
 * Email marketing provider with:
 * - Contact management
 * - Lists
 * - Campaigns
 * - Tags
 *
 * Uses OAuth2 authentication.
 * Rate Limits: 4 requests/second, 10,000 requests/day
 */

import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ConstantContactClient } from "./client/ConstantContactClient";
import { ConstantContactMCPAdapter } from "./mcp/ConstantContactMCPAdapter";
import {
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
    // Campaign Operations
    getCampaignsOperation,
    executeGetCampaigns,
    getCampaignOperation,
    executeGetCampaign,
    scheduleCampaignOperation,
    executeScheduleCampaign,
    // Tag Operations
    addTagsToContactsOperation,
    executeAddTagsToContacts,
    removeTagsFromContactsOperation,
    executeRemoveTagsFromContacts
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

export class ConstantContactProvider extends BaseProvider {
    readonly name = "constantcontact";
    readonly displayName = "Constant Contact";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 240, // 4 requests per second
            burstSize: 4
        }
    };

    private clientPool: Map<string, ConstantContactClient> = new Map();
    private mcpAdapter: ConstantContactMCPAdapter;

    constructor() {
        super();

        // Register Contact Operations
        this.registerOperation(getContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);

        // Register List Operations
        this.registerOperation(getListsOperation);
        this.registerOperation(getListOperation);
        this.registerOperation(createListOperation);
        this.registerOperation(addToListOperation);
        this.registerOperation(removeFromListOperation);

        // Register Campaign Operations
        this.registerOperation(getCampaignsOperation);
        this.registerOperation(getCampaignOperation);
        this.registerOperation(scheduleCampaignOperation);

        // Register Tag Operations
        this.registerOperation(addTagsToContactsOperation);
        this.registerOperation(removeTagsFromContactsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ConstantContactMCPAdapter(this.operations);
    }

    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://authz.constantcontact.com/oauth2/default/v1/authorize",
            tokenUrl: "https://authz.constantcontact.com/oauth2/default/v1/token",
            scopes: ["contact_data", "campaign_data", "offline_access"],
            clientId: appConfig.oauth.constantContact.clientId,
            clientSecret: appConfig.oauth.constantContact.clientSecret,
            redirectUri: getOAuthRedirectUri("constantcontact"),
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

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "getCampaign":
                return executeGetCampaign(client, params as never);
            case "scheduleCampaign":
                return executeScheduleCampaign(client, params as never);

            // Tag Operations
            case "addTagsToContacts":
                return executeAddTagsToContacts(client, params as never);
            case "removeTagsFromContacts":
                return executeRemoveTagsFromContacts(client, params as never);

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

    private getOrCreateClient(connection: ConnectionWithData): ConstantContactClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error("Constant Contact access token is required");
        }

        const client = new ConstantContactClient({
            accessToken: data.access_token,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }
}
