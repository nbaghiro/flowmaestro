import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { YouTubeClient } from "./client/YouTubeClient";
import {
    // Search
    searchOperation,
    executeSearch,
    // Videos
    getVideoOperation,
    executeGetVideo,
    listVideosOperation,
    executeListVideos,
    rateVideoOperation,
    executeRateVideo,
    // Channels
    getChannelOperation,
    executeGetChannel,
    // Playlists
    listPlaylistsOperation,
    executeListPlaylists,
    listPlaylistItemsOperation,
    executeListPlaylistItems,
    createPlaylistOperation,
    executeCreatePlaylist,
    updatePlaylistOperation,
    executeUpdatePlaylist,
    deletePlaylistOperation,
    executeDeletePlaylist,
    addToPlaylistOperation,
    executeAddToPlaylist,
    removeFromPlaylistOperation,
    executeRemoveFromPlaylist,
    // Comments
    listCommentsOperation,
    executeListComments,
    insertCommentOperation,
    executeInsertComment,
    deleteCommentOperation,
    executeDeleteComment,
    // Subscriptions
    listSubscriptionsOperation,
    executeListSubscriptions,
    subscribeOperation,
    executeSubscribe,
    unsubscribeOperation,
    executeUnsubscribe
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
 * YouTube Provider - implements OAuth2 authentication with YouTube Data API v3 operations
 *
 * ## Setup Instructions
 *
 * ### 1. Enable YouTube Data API v3 in Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Select your existing project (same as other Google integrations)
 * 3. Go to "APIs & Services" > "Library"
 * 4. Search for "YouTube Data API v3" and click "Enable"
 *
 * ### 2. Add YouTube Scopes to OAuth Consent Screen
 * 1. Go to "APIs & Services" > "OAuth consent screen"
 * 2. Click "Edit App"
 * 3. Add the following scopes:
 *    - https://www.googleapis.com/auth/youtube (Manage your YouTube account)
 *    - https://www.googleapis.com/auth/youtube.readonly (View your YouTube account)
 *    - https://www.googleapis.com/auth/youtube.upload (Manage your YouTube videos)
 *    - https://www.googleapis.com/auth/youtube.force-ssl (See, edit, delete your YouTube content)
 * 4. Save changes
 *
 * ### 3. Environment Variables
 * Uses the shared Google OAuth credentials:
 * ```
 * GOOGLE_CLIENT_ID=your_client_id
 * GOOGLE_CLIENT_SECRET=your_client_secret
 * ```
 *
 * ### 4. API Quota
 * - Default daily quota: 10,000 units
 * - Different operations have different costs:
 *   - search.list: 100 units
 *   - videos.list: 1 unit
 *   - videos.rate: 50 units
 *   - playlists.insert: 50 units
 *   - playlistItems.insert: 50 units
 *   - comments.insert: 50 units
 *   - subscriptions.insert: 50 units
 *
 * ### 5. Verification Requirements
 * YouTube API scopes may require Google's OAuth app verification depending on usage.
 */
export class YouTubeProvider extends BaseProvider {
    readonly name = "youtube";
    readonly displayName = "YouTube";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600 // Conservative rate limit
        }
    };

    private clientPool: Map<string, YouTubeClient> = new Map();

    constructor() {
        super();

        // Register search operations
        this.registerOperation(searchOperation);

        // Register video operations
        this.registerOperation(getVideoOperation);
        this.registerOperation(listVideosOperation);
        this.registerOperation(rateVideoOperation);

        // Register channel operations
        this.registerOperation(getChannelOperation);

        // Register playlist operations
        this.registerOperation(listPlaylistsOperation);
        this.registerOperation(listPlaylistItemsOperation);
        this.registerOperation(createPlaylistOperation);
        this.registerOperation(updatePlaylistOperation);
        this.registerOperation(deletePlaylistOperation);
        this.registerOperation(addToPlaylistOperation);
        this.registerOperation(removeFromPlaylistOperation);

        // Register comment operations
        this.registerOperation(listCommentsOperation);
        this.registerOperation(insertCommentOperation);
        this.registerOperation(deleteCommentOperation);

        // Register subscription operations
        this.registerOperation(listSubscriptionsOperation);
        this.registerOperation(subscribeOperation);
        this.registerOperation(unsubscribeOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: [
                "https://www.googleapis.com/auth/youtube",
                "https://www.googleapis.com/auth/youtube.readonly",
                "https://www.googleapis.com/auth/youtube.upload",
                "https://www.googleapis.com/auth/youtube.force-ssl"
            ],
            clientId: appConfig.oauth.google.clientId,
            clientSecret: appConfig.oauth.google.clientSecret,
            redirectUri: getOAuthRedirectUri("google"),
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
            // Search
            case "search":
                return await executeSearch(client, validatedParams as never);

            // Videos
            case "getVideo":
                return await executeGetVideo(client, validatedParams as never);
            case "listVideos":
                return await executeListVideos(client, validatedParams as never);
            case "rateVideo":
                return await executeRateVideo(client, validatedParams as never);

            // Channels
            case "getChannel":
                return await executeGetChannel(client, validatedParams as never);

            // Playlists
            case "listPlaylists":
                return await executeListPlaylists(client, validatedParams as never);
            case "listPlaylistItems":
                return await executeListPlaylistItems(client, validatedParams as never);
            case "createPlaylist":
                return await executeCreatePlaylist(client, validatedParams as never);
            case "updatePlaylist":
                return await executeUpdatePlaylist(client, validatedParams as never);
            case "deletePlaylist":
                return await executeDeletePlaylist(client, validatedParams as never);
            case "addToPlaylist":
                return await executeAddToPlaylist(client, validatedParams as never);
            case "removeFromPlaylist":
                return await executeRemoveFromPlaylist(client, validatedParams as never);

            // Comments
            case "listComments":
                return await executeListComments(client, validatedParams as never);
            case "insertComment":
                return await executeInsertComment(client, validatedParams as never);
            case "deleteComment":
                return await executeDeleteComment(client, validatedParams as never);

            // Subscriptions
            case "listSubscriptions":
                return await executeListSubscriptions(client, validatedParams as never);
            case "subscribe":
                return await executeSubscribe(client, validatedParams as never);
            case "unsubscribe":
                return await executeUnsubscribe(client, validatedParams as never);

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
            name: `youtube_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
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
        // Remove youtube_ prefix to get operation ID
        const operationId = toolName.replace("youtube_", "");

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
     * Get or create YouTube client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): YouTubeClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new YouTubeClient({
            accessToken: data.access_token
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
