import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { MicrosoftTeamsClient } from "./client/MicrosoftTeamsClient";
import {
    // Teams operations
    listJoinedTeamsOperation,
    executeListJoinedTeams,
    getTeamOperation,
    executeGetTeam,
    // Channel operations
    listChannelsOperation,
    executeListChannels,
    getChannelOperation,
    executeGetChannel,
    createChannelOperation,
    executeCreateChannel,
    sendChannelMessageOperation,
    executeSendChannelMessage,
    listChannelMessagesOperation,
    executeListChannelMessages,
    replyToChannelMessageOperation,
    executeReplyToChannelMessage,
    // Chat operations
    listChatsOperation,
    executeListChats,
    sendChatMessageOperation,
    executeSendChatMessage,
    listChatMessagesOperation,
    executeListChatMessages,
    listChatMembersOperation,
    executeListChatMembers
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
 * Microsoft Teams Provider - implements OAuth2 authentication with Microsoft Graph API
 *
 * ## Important Notes
 *
 * - Teams messaging APIs require **delegated permissions** (user context)
 * - Application permissions are only supported for migration scenarios
 * - Uses shared Microsoft OAuth credentials (MICROSOFT_CLIENT_ID/SECRET)
 *
 * ## Setup Instructions
 *
 * ### 1. Azure AD Application
 * Same setup as other Microsoft providers - uses shared MICROSOFT_CLIENT_ID
 *
 * ### 2. Configure API Permissions (Delegated)
 * Required permissions:
 * - User.Read (Sign in and read user profile)
 * - Team.ReadBasic.All (Read team names/descriptions)
 * - Channel.ReadBasic.All (Read channel names/descriptions)
 * - Channel.Create (Create channels)
 * - ChannelMessage.Send (Send channel messages)
 * - ChannelMessage.Read.All (Read channel messages)
 * - Chat.ReadWrite (Read/write chats)
 * - ChatMessage.Send (Send chat messages)
 * - ChatMessage.Read (Read chat messages)
 * - ChatMember.Read (Read chat members)
 * - offline_access (Maintain access via refresh tokens)
 *
 * ### 3. Configure Environment Variables
 * ```
 * MICROSOFT_CLIENT_ID=your_client_id
 * MICROSOFT_CLIENT_SECRET=your_client_secret
 * ```
 */
export class MicrosoftTeamsProvider extends BaseProvider {
    readonly name = "microsoft-teams";
    readonly displayName = "Microsoft Teams";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, MicrosoftTeamsClient> = new Map();

    constructor() {
        super();

        // Register teams operations
        this.registerOperation(listJoinedTeamsOperation);
        this.registerOperation(getTeamOperation);

        // Register channel operations
        this.registerOperation(listChannelsOperation);
        this.registerOperation(getChannelOperation);
        this.registerOperation(createChannelOperation);
        this.registerOperation(sendChannelMessageOperation);
        this.registerOperation(listChannelMessagesOperation);
        this.registerOperation(replyToChannelMessageOperation);

        // Register chat operations
        this.registerOperation(listChatsOperation);
        this.registerOperation(sendChatMessageOperation);
        this.registerOperation(listChatMessagesOperation);
        this.registerOperation(listChatMembersOperation);
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
                "Team.ReadBasic.All",
                "Channel.ReadBasic.All",
                "Channel.Create",
                "ChannelMessage.Send",
                "ChannelMessage.Read.All",
                "Chat.ReadWrite",
                "ChatMessage.Send",
                "ChatMessage.Read",
                "ChatMember.Read",
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
        const validatedParams = this.validateParams(operationId, params);
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Teams operations
            case "listJoinedTeams":
                return await executeListJoinedTeams(client, validatedParams as never);
            case "getTeam":
                return await executeGetTeam(client, validatedParams as never);

            // Channel operations
            case "listChannels":
                return await executeListChannels(client, validatedParams as never);
            case "getChannel":
                return await executeGetChannel(client, validatedParams as never);
            case "createChannel":
                return await executeCreateChannel(client, validatedParams as never);
            case "sendChannelMessage":
                return await executeSendChannelMessage(client, validatedParams as never);
            case "listChannelMessages":
                return await executeListChannelMessages(client, validatedParams as never);
            case "replyToChannelMessage":
                return await executeReplyToChannelMessage(client, validatedParams as never);

            // Chat operations
            case "listChats":
                return await executeListChats(client, validatedParams as never);
            case "sendChatMessage":
                return await executeSendChatMessage(client, validatedParams as never);
            case "listChatMessages":
                return await executeListChatMessages(client, validatedParams as never);
            case "listChatMembers":
                return await executeListChatMembers(client, validatedParams as never);

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
     * Get MCP tools for agent mode
     */
    getMCPTools(): MCPTool[] {
        return this.getOperations().map((op) => ({
            name: `microsoft_teams_${op.id}`,
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
        const operationId = toolName.replace("microsoft_teams_", "");

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
     * Get or create Teams client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MicrosoftTeamsClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new MicrosoftTeamsClient({
            accessToken: data.access_token
        });

        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (called on token refresh)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
