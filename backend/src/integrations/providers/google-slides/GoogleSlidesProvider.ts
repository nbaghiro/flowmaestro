import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleSlidesClient } from "./client/GoogleSlidesClient";
import {
    // Presentation operations
    createPresentationOperation,
    executeCreatePresentation,
    getPresentationOperation,
    executeGetPresentation,
    deletePresentationOperation,
    executeDeletePresentation,
    batchUpdateOperation,
    executeBatchUpdate,
    // Page operations
    getPageOperation,
    executeGetPage,
    getThumbnailOperation,
    executeGetThumbnail,
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
 * Google Slides Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Slides API:
 *    - Go to "APIs & Services" > "Library"
 *    - Search for "Google Slides API"
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
 *    - Scopes: Add https://www.googleapis.com/auth/presentations
 *              Add https://www.googleapis.com/auth/drive.file
 *    - Test users: Add your email for testing
 * 4. Create OAuth client ID:
 *    - Application type: Web application
 *    - Name: FlowMaestro Google Slides
 *    - Authorized redirect URIs: http://localhost:3001/api/oauth/google-slides/callback
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
 * supports Drive, Calendar, Gmail, Sheets, Docs, and user authentication.
 *
 * ### 4. OAuth Scopes
 * Required scopes for this provider:
 * - `https://www.googleapis.com/auth/presentations` - Full read/write access to Slides
 * - `https://www.googleapis.com/auth/drive.file` - Access to files created by app
 *
 * ### 5. Rate Limits
 * - Google Slides API has quota limits per project
 * - Default: 100 requests per 100 seconds per user
 * - Monitor usage in Google Cloud Console
 */
export class GoogleSlidesProvider extends BaseProvider {
    readonly name = "google-slides";
    readonly displayName = "Google Slides";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100 // 100 requests per 100 seconds per user
        }
    };

    private clientPool: Map<string, GoogleSlidesClient> = new Map();

    constructor() {
        super();

        // Register presentation operations
        this.registerOperation(createPresentationOperation);
        this.registerOperation(getPresentationOperation);
        this.registerOperation(deletePresentationOperation);
        this.registerOperation(batchUpdateOperation);

        // Register page operations
        this.registerOperation(getPageOperation);
        this.registerOperation(getThumbnailOperation);

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
                "https://www.googleapis.com/auth/presentations",
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
            // Presentation operations
            case "createPresentation":
                return await executeCreatePresentation(client, validatedParams as never);
            case "getPresentation":
                return await executeGetPresentation(client, validatedParams as never);
            case "deletePresentation":
                return await executeDeletePresentation(client, validatedParams as never);
            case "batchUpdate":
                return await executeBatchUpdate(client, validatedParams as never);

            // Page operations
            case "getPage":
                return await executeGetPage(client, validatedParams as never);
            case "getThumbnail":
                return await executeGetThumbnail(client, validatedParams as never);

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
        // Convert operations to MCP tools with google_slides_ prefix
        return this.getOperations().map((op) => ({
            name: `google_slides_${op.id}`,
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
        // Remove google_slides_ prefix to get operation ID
        const operationId = toolName.replace("google_slides_", "");

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
     * Get or create Google Slides client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleSlidesClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new GoogleSlidesClient({
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
