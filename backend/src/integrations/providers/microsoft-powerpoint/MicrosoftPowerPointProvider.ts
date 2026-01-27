import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { MicrosoftPowerPointClient } from "./client/MicrosoftPowerPointClient";
import {
    getPresentationOperation,
    executeGetPresentation,
    downloadPresentationOperation,
    executeDownloadPresentation,
    convertPresentationOperation,
    executeConvertPresentation,
    uploadPresentationOperation,
    executeUploadPresentation,
    replacePresentationOperation,
    executeReplacePresentation,
    searchPresentationsOperation,
    executeSearchPresentations,
    copyPresentationOperation,
    executeCopyPresentation,
    deletePresentationOperation,
    executeDeletePresentation,
    createSharingLinkOperation,
    executeCreateSharingLink,
    getPreviewUrlOperation,
    executeGetPreviewUrl
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
 * Microsoft PowerPoint Provider - implements OAuth2 authentication with PowerPoint presentation operations
 *
 * ## Important Notes
 *
 * - PowerPoint presentations are accessed through the OneDrive/Drive API in Microsoft Graph
 * - Presentations must be stored in OneDrive/SharePoint to use this API
 * - Supports presentation download, upload, conversion (PDF), and sharing
 *
 * ## Setup Instructions
 *
 * ### 1. Create Azure AD Application
 * Same setup as Microsoft OneDrive - uses shared MICROSOFT_CLIENT_ID
 *
 * ### 2. Configure API Permissions
 * Required Delegated permissions:
 * - Files.ReadWrite (Read and write user files)
 * - User.Read (Sign in and read user profile)
 * - offline_access (Maintain access)
 *
 * ### 3. Configure Environment Variables
 * ```
 * MICROSOFT_CLIENT_ID=your_client_id
 * MICROSOFT_CLIENT_SECRET=your_client_secret
 * ```
 *
 * ### 4. Usage
 * 1. User connects OneDrive via OAuth
 * 2. Get the itemId of a PowerPoint presentation from OneDrive
 * 3. Use the itemId to perform PowerPoint operations
 */
export class MicrosoftPowerPointProvider extends BaseProvider {
    readonly name = "microsoft-powerpoint";
    readonly displayName = "Microsoft PowerPoint";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, MicrosoftPowerPointClient> = new Map();

    constructor() {
        super();

        // Register presentation operations
        this.registerOperation(getPresentationOperation);
        this.registerOperation(downloadPresentationOperation);
        this.registerOperation(convertPresentationOperation);
        this.registerOperation(uploadPresentationOperation);
        this.registerOperation(replacePresentationOperation);
        this.registerOperation(searchPresentationsOperation);
        this.registerOperation(copyPresentationOperation);
        this.registerOperation(deletePresentationOperation);
        this.registerOperation(createSharingLinkOperation);
        this.registerOperation(getPreviewUrlOperation);
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
            case "getPresentation":
                return await executeGetPresentation(client, validatedParams as never);
            case "downloadPresentation":
                return await executeDownloadPresentation(client, validatedParams as never);
            case "convertPresentation":
                return await executeConvertPresentation(client, validatedParams as never);
            case "uploadPresentation":
                return await executeUploadPresentation(client, validatedParams as never);
            case "replacePresentation":
                return await executeReplacePresentation(client, validatedParams as never);
            case "searchPresentations":
                return await executeSearchPresentations(client, validatedParams as never);
            case "copyPresentation":
                return await executeCopyPresentation(client, validatedParams as never);
            case "deletePresentation":
                return await executeDeletePresentation(client, validatedParams as never);
            case "createSharingLink":
                return await executeCreateSharingLink(client, validatedParams as never);
            case "getPreviewUrl":
                return await executeGetPreviewUrl(client, validatedParams as never);

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
            name: `microsoft_powerpoint_${op.id}`,
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
        const operationId = toolName.replace("microsoft_powerpoint_", "");

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
     * Get or create PowerPoint client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MicrosoftPowerPointClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new MicrosoftPowerPointClient({
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
