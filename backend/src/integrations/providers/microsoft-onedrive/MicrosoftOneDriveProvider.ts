import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { MicrosoftOneDriveClient } from "./client/MicrosoftOneDriveClient";
import {
    listFilesOperation,
    executeListFiles,
    getFileOperation,
    executeGetFile,
    uploadFileOperation,
    executeUploadFile,
    createFolderOperation,
    executeCreateFolder,
    deleteFileOperation,
    executeDeleteFile,
    searchFilesOperation,
    executeSearchFiles,
    createSharingLinkOperation,
    executeCreateSharingLink
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
 * Microsoft OneDrive Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create Azure AD Application
 * 1. Go to https://portal.azure.com/
 * 2. Navigate to Microsoft Entra ID > App registrations
 * 3. Create a new registration:
 *    - Name: FlowMaestro
 *    - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
 *    - Redirect URI: https://your-api-url/api/oauth/microsoft/callback
 *
 * ### 2. Configure API Permissions
 * 1. Go to "API permissions" > "Add a permission" > "Microsoft Graph"
 * 2. Add Delegated permissions:
 *    - Files.ReadWrite (Read and write user files)
 *    - Files.ReadWrite.All (Read and write all files user can access)
 *    - User.Read (Sign in and read user profile)
 *    - offline_access (Maintain access to data)
 *
 * ### 3. Create Client Secret
 * 1. Go to "Certificates & secrets" > "Client secrets"
 * 2. Create new secret and copy the value
 *
 * ### 4. Configure Environment Variables
 * Add to your `.env` file:
 * ```
 * MICROSOFT_CLIENT_ID=your_client_id
 * MICROSOFT_CLIENT_SECRET=your_client_secret
 * ```
 *
 * ### 5. Rate Limits
 * - Microsoft Graph has rate limits per app and per user
 * - General limit: 10,000 requests per 10 minutes per app
 * - Recommended: Implement exponential backoff on 429 responses
 */
export class MicrosoftOneDriveProvider extends BaseProvider {
    readonly name = "microsoft-onedrive";
    readonly displayName = "Microsoft OneDrive";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, MicrosoftOneDriveClient> = new Map();

    constructor() {
        super();

        // Register file operations
        this.registerOperation(listFilesOperation);
        this.registerOperation(getFileOperation);
        this.registerOperation(uploadFileOperation);
        this.registerOperation(createFolderOperation);
        this.registerOperation(deleteFileOperation);
        this.registerOperation(searchFilesOperation);
        this.registerOperation(createSharingLinkOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scopes: ["User.Read", "Files.ReadWrite", "offline_access"],
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
            case "listFiles":
                return await executeListFiles(client, validatedParams as never);
            case "getFile":
                return await executeGetFile(client, validatedParams as never);
            case "uploadFile":
                return await executeUploadFile(client, validatedParams as never);
            case "createFolder":
                return await executeCreateFolder(client, validatedParams as never);
            case "deleteFile":
                return await executeDeleteFile(client, validatedParams as never);
            case "searchFiles":
                return await executeSearchFiles(client, validatedParams as never);
            case "createSharingLink":
                return await executeCreateSharingLink(client, validatedParams as never);
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
            name: `microsoft_onedrive_${op.id}`,
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
        const operationId = toolName.replace("microsoft_onedrive_", "");

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
     * Get or create OneDrive client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MicrosoftOneDriveClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new MicrosoftOneDriveClient({
            accessToken: data.access_token
        });

        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
