import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleDriveClient } from "./client/GoogleDriveClient";
import {
    // File operations
    uploadFileOperation,
    executeUploadFile,
    downloadFileOperation,
    executeDownloadFile,
    getFileOperation,
    executeGetFile,
    listFilesOperation,
    executeListFiles,
    createFolderOperation,
    executeCreateFolder,
    deleteFileOperation,
    executeDeleteFile,
    // Organization operations
    moveFileOperation,
    executeMoveFile,
    copyFileOperation,
    executeCopyFile,
    trashFileOperation,
    executeTrashFile,
    updateFileOperation,
    executeUpdateFile,
    // Sharing operations
    shareFileOperation,
    executeShareFile,
    listPermissionsOperation,
    executeListPermissions,
    revokePermissionOperation,
    executeRevokePermission,
    // Export operations
    exportDocumentOperation,
    executeExportDocument
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookRequestData
} from "../../core/types";

/**
 * Google Drive Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Drive API:
 *    - Go to "APIs & Services" > "Library"
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
 *    - Scopes: Add https://www.googleapis.com/auth/drive
 *    - Test users: Add your email for testing
 * 4. Create OAuth client ID:
 *    - Application type: Web application
 *    - Name: FlowMaestro Google Drive
 *    - Authorized redirect URIs: {API_URL}/oauth/google/callback
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
 * supports Sheets, Calendar, Gmail, and user authentication. The consent screen
 * should include the drive scope along with other Google API scopes.
 *
 * ### 4. OAuth Scopes
 * Required scope for this provider:
 * - `https://www.googleapis.com/auth/drive` - Full read/write access to Drive
 *
 * Alternative scopes (for more restricted access):
 * - `https://www.googleapis.com/auth/drive.file` - Per-file access (files created by app)
 * - `https://www.googleapis.com/auth/drive.readonly` - Read-only access
 *
 * The shared Google OAuth client may also include other scopes for Sheets,
 * Calendar, Gmail, etc. This is normal and allows multiple Google integrations
 * to use the same OAuth client.
 *
 * ### 5. Rate Limits
 * - Google Drive API has quota limits per project
 * - Default: 20,000 requests per 100 seconds per project
 * - Recommended: Stay under 600 requests per minute per user
 * - Monitor usage in Google Cloud Console
 *
 * ### 6. Testing Connection
 * After setup, test the connection by:
 * 1. Creating a connection in FlowMaestro
 * 2. Authorizing via OAuth flow
 * 3. Running "Test Connection" to verify access
 */
export class GoogleDriveProvider extends BaseProvider {
    readonly name = "google-drive";
    readonly displayName = "Google Drive";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true, // Push notifications via channel subscriptions
        rateLimit: {
            tokensPerMinute: 600 // Conservative limit (actual is 20,000 per 100 seconds)
        }
    };

    private clientPool: Map<string, GoogleDriveClient> = new Map();

    constructor() {
        super();

        // Register file operations
        this.registerOperation(uploadFileOperation);
        this.registerOperation(downloadFileOperation);
        this.registerOperation(getFileOperation);
        this.registerOperation(listFilesOperation);
        this.registerOperation(createFolderOperation);
        this.registerOperation(deleteFileOperation);

        // Register organization operations
        this.registerOperation(moveFileOperation);
        this.registerOperation(copyFileOperation);
        this.registerOperation(trashFileOperation);
        this.registerOperation(updateFileOperation);

        // Register sharing operations
        this.registerOperation(shareFileOperation);
        this.registerOperation(listPermissionsOperation);
        this.registerOperation(revokePermissionOperation);

        // Register export operations
        this.registerOperation(exportDocumentOperation);

        // Configure webhook settings (push notifications)
        this.setWebhookConfig({
            setupType: "automatic", // Channel subscriptions via API
            signatureType: "none", // Google uses channel tokens instead of signatures
            eventHeader: "X-Goog-Resource-State"
        });

        // Register trigger events
        this.registerTrigger({
            id: "file_created",
            name: "File Created",
            description: "Triggered when a new file is added to Drive",
            requiredScopes: ["https://www.googleapis.com/auth/drive"],
            configFields: [
                {
                    name: "folderId",
                    label: "Folder",
                    type: "text",
                    required: false,
                    description: "Folder ID to monitor (leave empty for entire Drive)",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                },
                {
                    name: "mimeType",
                    label: "File Type",
                    type: "select",
                    required: false,
                    description: "Filter by file type",
                    options: [
                        { value: "application/vnd.google-apps.document", label: "Google Docs" },
                        {
                            value: "application/vnd.google-apps.spreadsheet",
                            label: "Google Sheets"
                        },
                        {
                            value: "application/vnd.google-apps.presentation",
                            label: "Google Slides"
                        },
                        { value: "application/pdf", label: "PDF" },
                        { value: "image/*", label: "Images" }
                    ]
                }
            ],
            tags: ["files", "storage"]
        });

        this.registerTrigger({
            id: "file_updated",
            name: "File Updated",
            description: "Triggered when a file is modified",
            requiredScopes: ["https://www.googleapis.com/auth/drive"],
            configFields: [
                {
                    name: "fileId",
                    label: "Specific File",
                    type: "text",
                    required: false,
                    description: "File ID to monitor (leave empty for any file)",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                },
                {
                    name: "folderId",
                    label: "Folder",
                    type: "text",
                    required: false,
                    description: "Folder ID to monitor (leave empty for entire Drive)",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                }
            ],
            tags: ["files", "storage"]
        });

        this.registerTrigger({
            id: "file_deleted",
            name: "File Deleted",
            description: "Triggered when a file is deleted or trashed",
            requiredScopes: ["https://www.googleapis.com/auth/drive"],
            configFields: [
                {
                    name: "folderId",
                    label: "Folder",
                    type: "text",
                    required: false,
                    description: "Folder ID to monitor (leave empty for entire Drive)",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                }
            ],
            tags: ["files", "storage"]
        });

        this.registerTrigger({
            id: "file_shared",
            name: "File Shared",
            description: "Triggered when a file's sharing permissions change",
            requiredScopes: ["https://www.googleapis.com/auth/drive"],
            configFields: [
                {
                    name: "folderId",
                    label: "Folder",
                    type: "text",
                    required: false,
                    description: "Folder ID to monitor (leave empty for entire Drive)",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                }
            ],
            tags: ["files", "sharing"]
        });
    }

    /**
     * Extract event type from Google Drive push notification
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        // Google Drive uses X-Goog-Resource-State header
        const resourceState = this.getHeader(request.headers, "X-Goog-Resource-State");

        switch (resourceState) {
            case "change":
                return "file_updated";
            case "add":
                return "file_created";
            case "remove":
            case "trash":
                return "file_deleted";
            case "sync":
                return "sync"; // Initial sync notification
            default:
                return undefined;
        }
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: ["https://www.googleapis.com/auth/drive"],
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
            // File operations
            case "uploadFile":
                return await executeUploadFile(client, validatedParams as never);
            case "downloadFile":
                return await executeDownloadFile(client, validatedParams as never);
            case "getFile":
                return await executeGetFile(client, validatedParams as never);
            case "listFiles":
                return await executeListFiles(client, validatedParams as never);
            case "createFolder":
                return await executeCreateFolder(client, validatedParams as never);
            case "deleteFile":
                return await executeDeleteFile(client, validatedParams as never);

            // Organization operations
            case "moveFile":
                return await executeMoveFile(client, validatedParams as never);
            case "copyFile":
                return await executeCopyFile(client, validatedParams as never);
            case "trashFile":
                return await executeTrashFile(client, validatedParams as never);
            case "updateFile":
                return await executeUpdateFile(client, validatedParams as never);

            // Sharing operations
            case "shareFile":
                return await executeShareFile(client, validatedParams as never);
            case "listPermissions":
                return await executeListPermissions(client, validatedParams as never);
            case "revokePermission":
                return await executeRevokePermission(client, validatedParams as never);

            // Export operations
            case "exportDocument":
                return await executeExportDocument(client, validatedParams as never);

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
        // Convert operations to MCP tools with google_drive_ prefix
        return this.getOperations().map((op) => ({
            name: `google_drive_${op.id}`,
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
        // Remove google_drive_ prefix to get operation ID
        const operationId = toolName.replace("google_drive_", "");

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
     * Get or create Google Drive client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleDriveClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new GoogleDriveClient({
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
