import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleDocsClient } from "./client/GoogleDocsClient";
import {
    // Document operations
    createDocumentOperation,
    executeCreateDocument,
    getDocumentOperation,
    executeGetDocument,
    deleteDocumentOperation,
    executeDeleteDocument,
    batchUpdateOperation,
    executeBatchUpdate,
    // Content manipulation operations
    appendTextOperation,
    executeAppendText,
    replaceTextOperation,
    executeReplaceText,
    insertTableOperation,
    executeInsertTable,
    // Drive integration operations
    moveToFolderOperation,
    executeMoveToFolder
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
 * Google Docs Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Docs API:
 *    - Go to "APIs & Services" > "Library"
 *    - Search for "Google Docs API"
 *    - Click "Enable"
 * 4. Also enable Google Drive API (for folder operations):
 *    - Search for "Google Drive API"
 *    - Click "Enable"
 *
 * ### 2. Create OAuth 2.0 Credentials
 * 1. Go to "APIs & Services" > "Credentials"
 * 2. Click "Create Credentials" > "OAuth client ID"
 * 3. Configure consent screen if prompted:
 *    - User Type: External (or Internal for Workspace)
 *    - App name: FlowMaestro (or your app name)
 *    - Support email: Your email
 *    - Scopes: Add https://www.googleapis.com/auth/documents
 *              Add https://www.googleapis.com/auth/drive.file
 *    - Test users: Add your email for testing
 * 4. Create OAuth client ID:
 *    - Application type: Web application
 *    - Name: FlowMaestro Google Docs
 *    - Authorized redirect URIs: http://localhost:3001/api/oauth/google-docs/callback
 *      (replace with your API_URL in production)
 * 5. Copy Client ID and Client Secret
 *
 * ### 3. Configure Environment Variables
 * Add to your `.env` file:
 * ```
 * GOOGLE_CLIENT_ID=your_client_id_here
 * GOOGLE_CLIENT_SECRET=your_client_secret_here
 * ```
 *
 * Note: This uses the shared Google OAuth client (GOOGLE_CLIENT_ID) that also
 * supports Drive, Calendar, Gmail, Sheets, and user authentication.
 *
 * ### 4. OAuth Scopes
 * Required scopes for this provider:
 * - `https://www.googleapis.com/auth/documents` - Full read/write access to Docs
 * - `https://www.googleapis.com/auth/drive.file` - Access to files created by app
 *
 * ### 5. Rate Limits
 * - Google Docs API has quota limits per project
 * - Default: 100 requests per 100 seconds per user
 * - Monitor usage in Google Cloud Console
 */
export class GoogleDocsProvider extends BaseProvider {
    readonly name = "google-docs";
    readonly displayName = "Google Docs";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100 // 100 requests per 100 seconds per user
        }
    };

    private clientPool: Map<string, GoogleDocsClient> = new Map();

    constructor() {
        super();

        // Register document operations
        this.registerOperation(createDocumentOperation);
        this.registerOperation(getDocumentOperation);
        this.registerOperation(deleteDocumentOperation);
        this.registerOperation(batchUpdateOperation);

        // Register content manipulation operations
        this.registerOperation(appendTextOperation);
        this.registerOperation(replaceTextOperation);
        this.registerOperation(insertTableOperation);

        // Register drive integration operations
        this.registerOperation(moveToFolderOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: [
                "https://www.googleapis.com/auth/documents",
                "https://www.googleapis.com/auth/drive.file"
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
            // Document operations
            case "createDocument":
                return await executeCreateDocument(client, validatedParams as never);
            case "getDocument":
                return await executeGetDocument(client, validatedParams as never);
            case "deleteDocument":
                return await executeDeleteDocument(client, validatedParams as never);
            case "batchUpdate":
                return await executeBatchUpdate(client, validatedParams as never);

            // Content manipulation operations
            case "appendText":
                return await executeAppendText(client, validatedParams as never);
            case "replaceText":
                return await executeReplaceText(client, validatedParams as never);
            case "insertTable":
                return await executeInsertTable(client, validatedParams as never);

            // Drive integration operations
            case "moveToFolder":
                return await executeMoveToFolder(client, validatedParams as never);

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
        // Convert operations to MCP tools with google_docs_ prefix
        return this.getOperations().map((op) => ({
            name: `google_docs_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
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
        // Remove google_docs_ prefix to get operation ID
        const operationId = toolName.replace("google_docs_", "");

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
     * Get or create Google Docs client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleDocsClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new GoogleDocsClient({
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
