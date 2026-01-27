import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { MicrosoftOutlookClient } from "./client/MicrosoftOutlookClient";
import {
    // Email - Folder operations
    listMailFoldersOperation,
    executeListMailFolders,
    // Email - Message operations
    listMessagesOperation,
    executeListMessages,
    getMessageOperation,
    executeGetMessage,
    sendMailOperation,
    executeSendMail,
    replyToMessageOperation,
    executeReplyToMessage,
    forwardMessageOperation,
    executeForwardMessage,
    moveMessageOperation,
    executeMoveMessage,
    deleteMessageOperation,
    executeDeleteMessage,
    markAsReadOperation,
    executeMarkAsRead,
    // Calendar operations
    listCalendarsOperation,
    executeListCalendars,
    listEventsOperation,
    executeListEvents,
    getEventOperation,
    executeGetEvent,
    createEventOperation,
    executeCreateEvent,
    updateEventOperation,
    executeUpdateEvent,
    deleteEventOperation,
    executeDeleteEvent,
    respondToEventOperation,
    executeRespondToEvent
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
 * Microsoft Outlook Provider - implements OAuth2 authentication with Microsoft Graph API
 *
 * ## Important Notes
 *
 * - Uses Microsoft Graph API for Mail and Calendar operations
 * - Requires delegated permissions (user context)
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
 * - Mail.Read (Read user mail)
 * - Mail.ReadWrite (Read and write user mail)
 * - Mail.Send (Send mail as user)
 * - Calendars.Read (Read user calendars)
 * - Calendars.ReadWrite (Read and write user calendars)
 * - offline_access (Maintain access via refresh tokens)
 *
 * ### 3. Configure Environment Variables
 * ```
 * MICROSOFT_CLIENT_ID=your_client_id
 * MICROSOFT_CLIENT_SECRET=your_client_secret
 * ```
 */
export class MicrosoftOutlookProvider extends BaseProvider {
    readonly name = "microsoft-outlook";
    readonly displayName = "Microsoft Outlook";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, MicrosoftOutlookClient> = new Map();

    constructor() {
        super();

        // Register email folder operations
        this.registerOperation(listMailFoldersOperation);

        // Register email message operations
        this.registerOperation(listMessagesOperation);
        this.registerOperation(getMessageOperation);
        this.registerOperation(sendMailOperation);
        this.registerOperation(replyToMessageOperation);
        this.registerOperation(forwardMessageOperation);
        this.registerOperation(moveMessageOperation);
        this.registerOperation(deleteMessageOperation);
        this.registerOperation(markAsReadOperation);

        // Register calendar operations
        this.registerOperation(listCalendarsOperation);
        this.registerOperation(listEventsOperation);
        this.registerOperation(getEventOperation);
        this.registerOperation(createEventOperation);
        this.registerOperation(updateEventOperation);
        this.registerOperation(deleteEventOperation);
        this.registerOperation(respondToEventOperation);
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
                "Mail.Read",
                "Mail.ReadWrite",
                "Mail.Send",
                "Calendars.Read",
                "Calendars.ReadWrite",
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
            // Email folder operations
            case "listMailFolders":
                return await executeListMailFolders(client, validatedParams as never);

            // Email message operations
            case "listMessages":
                return await executeListMessages(client, validatedParams as never);
            case "getMessage":
                return await executeGetMessage(client, validatedParams as never);
            case "sendMail":
                return await executeSendMail(client, validatedParams as never);
            case "replyToMessage":
                return await executeReplyToMessage(client, validatedParams as never);
            case "forwardMessage":
                return await executeForwardMessage(client, validatedParams as never);
            case "moveMessage":
                return await executeMoveMessage(client, validatedParams as never);
            case "deleteMessage":
                return await executeDeleteMessage(client, validatedParams as never);
            case "markAsRead":
                return await executeMarkAsRead(client, validatedParams as never);

            // Calendar operations
            case "listCalendars":
                return await executeListCalendars(client, validatedParams as never);
            case "listEvents":
                return await executeListEvents(client, validatedParams as never);
            case "getEvent":
                return await executeGetEvent(client, validatedParams as never);
            case "createEvent":
                return await executeCreateEvent(client, validatedParams as never);
            case "updateEvent":
                return await executeUpdateEvent(client, validatedParams as never);
            case "deleteEvent":
                return await executeDeleteEvent(client, validatedParams as never);
            case "respondToEvent":
                return await executeRespondToEvent(client, validatedParams as never);

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
            name: `microsoft_outlook_${op.id}`,
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
        const operationId = toolName.replace("microsoft_outlook_", "");

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
     * Get or create Outlook client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MicrosoftOutlookClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new MicrosoftOutlookClient({
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
