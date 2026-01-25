/**
 * Mailchimp Integration Provider
 *
 * Email marketing platform with OAuth 2.0 authentication.
 * Supports audiences (lists), members, tags, segments, campaigns, and templates.
 *
 * Note: Mailchimp API endpoint varies per account - fetched from OAuth metadata endpoint.
 * Member endpoints use MD5 hash of lowercase email as subscriber_hash.
 */

import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { MailchimpClient } from "./client/MailchimpClient";
import { MailchimpMCPAdapter } from "./mcp/MailchimpMCPAdapter";
import {
    // List Operations
    getListsOperation,
    executeGetLists,
    getListOperation,
    executeGetList,
    createListOperation,
    executeCreateList,
    updateListOperation,
    executeUpdateList,
    // Member Operations
    getMembersOperation,
    executeGetMembers,
    getMemberOperation,
    executeGetMember,
    addMemberOperation,
    executeAddMember,
    updateMemberOperation,
    executeUpdateMember,
    archiveMemberOperation,
    executeArchiveMember,
    deleteMemberPermanentlyOperation,
    executeDeleteMemberPermanently,
    // Tag Operations
    getTagsOperation,
    executeGetTags,
    addTagsToMemberOperation,
    executeAddTagsToMember,
    removeTagsFromMemberOperation,
    executeRemoveTagsFromMember,
    // Segment Operations
    getSegmentsOperation,
    executeGetSegments,
    getSegmentMembersOperation,
    executeGetSegmentMembers,
    // Campaign Operations
    getCampaignsOperation,
    executeGetCampaigns,
    getCampaignOperation,
    executeGetCampaign,
    createCampaignOperation,
    executeCreateCampaign,
    updateCampaignOperation,
    executeUpdateCampaign,
    sendCampaignOperation,
    executeSendCampaign,
    scheduleCampaignOperation,
    executeScheduleCampaign,
    unscheduleCampaignOperation,
    executeUnscheduleCampaign,
    // Template Operations
    getTemplatesOperation,
    executeGetTemplates,
    getTemplateOperation,
    executeGetTemplate
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

interface MailchimpConnectionMetadata {
    api_endpoint?: string;
    dc?: string;
}

export class MailchimpProvider extends BaseProvider {
    readonly name = "mailchimp";
    readonly displayName = "Mailchimp";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600, // 10 concurrent connections
            burstSize: 10
        }
    };

    private clientPool: Map<string, MailchimpClient> = new Map();
    private mcpAdapter: MailchimpMCPAdapter;

    constructor() {
        super();

        // Register List (Audience) Operations (4 operations)
        this.registerOperation(getListsOperation);
        this.registerOperation(getListOperation);
        this.registerOperation(createListOperation);
        this.registerOperation(updateListOperation);

        // Register Member Operations (6 operations)
        this.registerOperation(getMembersOperation);
        this.registerOperation(getMemberOperation);
        this.registerOperation(addMemberOperation);
        this.registerOperation(updateMemberOperation);
        this.registerOperation(archiveMemberOperation);
        this.registerOperation(deleteMemberPermanentlyOperation);

        // Register Tag Operations (3 operations)
        this.registerOperation(getTagsOperation);
        this.registerOperation(addTagsToMemberOperation);
        this.registerOperation(removeTagsFromMemberOperation);

        // Register Segment Operations (2 operations)
        this.registerOperation(getSegmentsOperation);
        this.registerOperation(getSegmentMembersOperation);

        // Register Campaign Operations (7 operations)
        this.registerOperation(getCampaignsOperation);
        this.registerOperation(getCampaignOperation);
        this.registerOperation(createCampaignOperation);
        this.registerOperation(updateCampaignOperation);
        this.registerOperation(sendCampaignOperation);
        this.registerOperation(scheduleCampaignOperation);
        this.registerOperation(unscheduleCampaignOperation);

        // Register Template Operations (2 operations)
        this.registerOperation(getTemplatesOperation);
        this.registerOperation(getTemplateOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new MailchimpMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     * Note: Mailchimp doesn't use scopes - access is determined by app settings
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://login.mailchimp.com/oauth2/authorize",
            tokenUrl: "https://login.mailchimp.com/oauth2/token",
            scopes: [], // Mailchimp doesn't use granular scopes
            clientId: appConfig.oauth.mailchimp.clientId,
            clientSecret: appConfig.oauth.mailchimp.clientSecret,
            redirectUri: getOAuthRedirectUri("mailchimp"),
            refreshable: false // Mailchimp tokens don't expire but can't be refreshed
        };

        return config;
    }

    /**
     * Execute an operation
     */
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
            case "updateList":
                return executeUpdateList(client, params as never);

            // Member Operations
            case "getMembers":
                return executeGetMembers(client, params as never);
            case "getMember":
                return executeGetMember(client, params as never);
            case "addMember":
                return executeAddMember(client, params as never);
            case "updateMember":
                return executeUpdateMember(client, params as never);
            case "archiveMember":
                return executeArchiveMember(client, params as never);
            case "deleteMemberPermanently":
                return executeDeleteMemberPermanently(client, params as never);

            // Tag Operations
            case "getTags":
                return executeGetTags(client, params as never);
            case "addTagsToMember":
                return executeAddTagsToMember(client, params as never);
            case "removeTagsFromMember":
                return executeRemoveTagsFromMember(client, params as never);

            // Segment Operations
            case "getSegments":
                return executeGetSegments(client, params as never);
            case "getSegmentMembers":
                return executeGetSegmentMembers(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);
            case "getCampaign":
                return executeGetCampaign(client, params as never);
            case "createCampaign":
                return executeCreateCampaign(client, params as never);
            case "updateCampaign":
                return executeUpdateCampaign(client, params as never);
            case "sendCampaign":
                return executeSendCampaign(client, params as never);
            case "scheduleCampaign":
                return executeScheduleCampaign(client, params as never);
            case "unscheduleCampaign":
                return executeUnscheduleCampaign(client, params as never);

            // Template Operations
            case "getTemplates":
                return executeGetTemplates(client, params as never);
            case "getTemplate":
                return executeGetTemplate(client, params as never);

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
     * Get MCP tools for AI agent integration
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create a client for a connection (with caching)
     */
    private getOrCreateClient(connection: ConnectionWithData): MailchimpClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get access token from OAuth2 connection data
        const data = connection.data as OAuth2TokenData;
        const metadata = connection.metadata as MailchimpConnectionMetadata | undefined;

        if (!data.access_token) {
            throw new Error("Mailchimp access token is required");
        }

        // Get API endpoint from metadata (set during OAuth callback)
        // Format: https://us1.api.mailchimp.com (datacenter varies)
        let apiEndpoint = metadata?.api_endpoint;

        if (!apiEndpoint) {
            // Fallback: try to extract from dc in metadata or default
            const dc = metadata?.dc || "us1";
            apiEndpoint = `https://${dc}.api.mailchimp.com`;
        }

        const client = new MailchimpClient({
            accessToken: data.access_token,
            apiEndpoint,
            connectionId: connection.id
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client (e.g., after token refresh)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
