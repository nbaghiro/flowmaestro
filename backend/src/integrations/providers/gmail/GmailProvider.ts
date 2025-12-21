import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GmailClient } from "./client/GmailClient";
import {
    // Message operations
    listMessagesOperation,
    executeListMessages,
    getMessageOperation,
    executeGetMessage,
    sendMessageOperation,
    executeSendMessage,
    replyToMessageOperation,
    executeReplyToMessage,
    forwardMessageOperation,
    executeForwardMessage,
    modifyMessageOperation,
    executeModifyMessage,
    trashMessageOperation,
    executeTrashMessage,
    untrashMessageOperation,
    executeUntrashMessage,
    // Thread operations
    listThreadsOperation,
    executeListThreads,
    getThreadOperation,
    executeGetThread,
    modifyThreadOperation,
    executeModifyThread,
    trashThreadOperation,
    executeTrashThread,
    // Label operations
    listLabelsOperation,
    executeListLabels,
    createLabelOperation,
    executeCreateLabel,
    updateLabelOperation,
    executeUpdateLabel,
    deleteLabelOperation,
    executeDeleteLabel,
    // Attachment operations
    getAttachmentOperation,
    executeGetAttachment
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
 * Gmail Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Enable Gmail API in Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Select your existing project (same as other Google integrations)
 * 3. Go to "APIs & Services" > "Library"
 * 4. Search for "Gmail API" and click "Enable"
 *
 * ### 2. Add Gmail Scopes to OAuth Consent Screen
 * 1. Go to "APIs & Services" > "OAuth consent screen"
 * 2. Click "Edit App"
 * 3. Add the following scopes:
 *    - https://www.googleapis.com/auth/gmail.modify (Restricted)
 *    - https://www.googleapis.com/auth/gmail.send (Sensitive)
 *    - https://www.googleapis.com/auth/gmail.compose (Restricted)
 * 4. Save changes
 *
 * ### 3. Environment Variables
 * Uses the shared Google OAuth credentials:
 * ```
 * GOOGLE_CLIENT_ID=your_client_id
 * GOOGLE_CLIENT_SECRET=your_client_secret
 * ```
 *
 * ### 4. OAuth Scopes
 * Required scopes for full functionality:
 * - `gmail.modify` - Read, compose, send, and modify emails (including labels)
 * - `gmail.send` - Send emails only
 * - `gmail.compose` - Create and modify drafts, send emails
 *
 * Note: gmail.modify includes all capabilities of gmail.readonly
 *
 * ### 5. Rate Limits
 * - Gmail API quota: 250 quota units per user per second
 * - Daily limit: 1,000,000,000 quota units per day
 * - Recommended: Stay under 50 requests per second per user
 *
 * ### 6. Verification Requirements
 * Gmail API scopes are restricted and require:
 * - Google's OAuth app verification
 * - Privacy policy and terms of service
 * - Security assessment (if storing user data on servers)
 * - Allow 4-6 weeks for verification process
 */
export class GmailProvider extends BaseProvider {
    readonly name = "gmail";
    readonly displayName = "Gmail";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 3000 // 50 requests/second = 3000/minute
        }
    };

    private clientPool: Map<string, GmailClient> = new Map();

    constructor() {
        super();

        // Register message operations
        this.registerOperation(listMessagesOperation);
        this.registerOperation(getMessageOperation);
        this.registerOperation(sendMessageOperation);
        this.registerOperation(replyToMessageOperation);
        this.registerOperation(forwardMessageOperation);
        this.registerOperation(modifyMessageOperation);
        this.registerOperation(trashMessageOperation);
        this.registerOperation(untrashMessageOperation);

        // Register thread operations
        this.registerOperation(listThreadsOperation);
        this.registerOperation(getThreadOperation);
        this.registerOperation(modifyThreadOperation);
        this.registerOperation(trashThreadOperation);

        // Register label operations
        this.registerOperation(listLabelsOperation);
        this.registerOperation(createLabelOperation);
        this.registerOperation(updateLabelOperation);
        this.registerOperation(deleteLabelOperation);

        // Register attachment operations
        this.registerOperation(getAttachmentOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: [
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/gmail.compose"
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
            // Message operations
            case "listMessages":
                return await executeListMessages(client, validatedParams as never);
            case "getMessage":
                return await executeGetMessage(client, validatedParams as never);
            case "sendMessage":
                return await executeSendMessage(client, validatedParams as never);
            case "replyToMessage":
                return await executeReplyToMessage(client, validatedParams as never);
            case "forwardMessage":
                return await executeForwardMessage(client, validatedParams as never);
            case "modifyMessage":
                return await executeModifyMessage(client, validatedParams as never);
            case "trashMessage":
                return await executeTrashMessage(client, validatedParams as never);
            case "untrashMessage":
                return await executeUntrashMessage(client, validatedParams as never);

            // Thread operations
            case "listThreads":
                return await executeListThreads(client, validatedParams as never);
            case "getThread":
                return await executeGetThread(client, validatedParams as never);
            case "modifyThread":
                return await executeModifyThread(client, validatedParams as never);
            case "trashThread":
                return await executeTrashThread(client, validatedParams as never);

            // Label operations
            case "listLabels":
                return await executeListLabels(client, validatedParams as never);
            case "createLabel":
                return await executeCreateLabel(client, validatedParams as never);
            case "updateLabel":
                return await executeUpdateLabel(client, validatedParams as never);
            case "deleteLabel":
                return await executeDeleteLabel(client, validatedParams as never);

            // Attachment operations
            case "getAttachment":
                return await executeGetAttachment(client, validatedParams as never);

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
            name: `gmail_${op.id}`,
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
        // Remove gmail_ prefix to get operation ID
        const operationId = toolName.replace("gmail_", "");

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
     * Get or create Gmail client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GmailClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new GmailClient({
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
