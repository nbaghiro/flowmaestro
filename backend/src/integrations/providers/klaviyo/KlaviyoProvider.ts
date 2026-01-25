/**
 * Klaviyo Integration Provider
 *
 * E-commerce email and SMS marketing automation with OAuth 2.0 + PKCE authentication.
 *
 * Supports profiles, lists, events, and campaigns.
 */

import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { KlaviyoClient } from "./client/KlaviyoClient";
import { KlaviyoMCPAdapter } from "./mcp/KlaviyoMCPAdapter";
import {
    // Profile Operations
    getProfilesOperation,
    executeGetProfiles,
    getProfileOperation,
    executeGetProfile,
    createProfileOperation,
    executeCreateProfile,
    updateProfileOperation,
    executeUpdateProfile,
    subscribeProfileOperation,
    executeSubscribeProfile,
    // List Operations
    getListsOperation,
    executeGetLists,
    getListProfilesOperation,
    executeGetListProfiles,
    addProfilesToListOperation,
    executeAddProfilesToList,
    removeProfilesFromListOperation,
    executeRemoveProfilesFromList,
    // Event Operations
    createEventOperation,
    executeCreateEvent,
    // Campaign Operations
    getCampaignsOperation,
    executeGetCampaigns
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

export class KlaviyoProvider extends BaseProvider {
    readonly name = "klaviyo";
    readonly displayName = "Klaviyo";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 75, // Klaviyo allows 75 requests per second burst, ~1000/min sustained
            burstSize: 75
        }
    };

    private clientPool: Map<string, KlaviyoClient> = new Map();
    private mcpAdapter: KlaviyoMCPAdapter;

    constructor() {
        super();

        // Register Profile Operations (5 operations)
        this.registerOperation(getProfilesOperation);
        this.registerOperation(getProfileOperation);
        this.registerOperation(createProfileOperation);
        this.registerOperation(updateProfileOperation);
        this.registerOperation(subscribeProfileOperation);

        // Register List Operations (4 operations)
        this.registerOperation(getListsOperation);
        this.registerOperation(getListProfilesOperation);
        this.registerOperation(addProfilesToListOperation);
        this.registerOperation(removeProfilesFromListOperation);

        // Register Event Operations (1 operation)
        this.registerOperation(createEventOperation);

        // Register Campaign Operations (1 operation)
        this.registerOperation(getCampaignsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new KlaviyoMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.klaviyo.com/oauth/authorize",
            tokenUrl: "https://a.klaviyo.com/oauth/token",
            scopes: [
                "lists:read",
                "lists:write",
                "profiles:read",
                "profiles:write",
                "campaigns:read",
                "events:read",
                "events:write",
                "segments:read",
                "metrics:read"
            ],
            clientId: appConfig.oauth.klaviyo.clientId,
            clientSecret: appConfig.oauth.klaviyo.clientSecret,
            redirectUri: getOAuthRedirectUri("klaviyo"),
            refreshable: true
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
            // Profile Operations
            case "getProfiles":
                return executeGetProfiles(client, params as never);
            case "getProfile":
                return executeGetProfile(client, params as never);
            case "createProfile":
                return executeCreateProfile(client, params as never);
            case "updateProfile":
                return executeUpdateProfile(client, params as never);
            case "subscribeProfile":
                return executeSubscribeProfile(client, params as never);

            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getListProfiles":
                return executeGetListProfiles(client, params as never);
            case "addProfilesToList":
                return executeAddProfilesToList(client, params as never);
            case "removeProfilesFromList":
                return executeRemoveProfilesFromList(client, params as never);

            // Event Operations
            case "createEvent":
                return executeCreateEvent(client, params as never);

            // Campaign Operations
            case "getCampaigns":
                return executeGetCampaigns(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): KlaviyoClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get access token from OAuth2 connection data
        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error("Klaviyo access token is required");
        }

        const client = new KlaviyoClient({
            accessToken: data.access_token,
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
