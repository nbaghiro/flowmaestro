import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { MicrosoftWordClient } from "./client/MicrosoftWordClient";
import {
    getDocumentOperation,
    executeGetDocument,
    downloadDocumentOperation,
    executeDownloadDocument,
    convertDocumentOperation,
    executeConvertDocument,
    uploadDocumentOperation,
    executeUploadDocument,
    replaceDocumentOperation,
    executeReplaceDocument,
    searchDocumentsOperation,
    executeSearchDocuments,
    copyDocumentOperation,
    executeCopyDocument,
    deleteDocumentOperation,
    executeDeleteDocument,
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
 * Microsoft Word Provider - implements OAuth2 authentication with Word document operations
 *
 * ## Important Notes
 *
 * - Word documents are accessed through the OneDrive/Drive API in Microsoft Graph
 * - Workbooks must be stored in OneDrive/SharePoint to use this API
 * - Supports document download, upload, conversion (PDF/HTML), and sharing
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
 * 2. Get the itemId of a Word document from OneDrive
 * 3. Use the itemId to perform Word operations
 */
export class MicrosoftWordProvider extends BaseProvider {
    readonly name = "microsoft-word";
    readonly displayName = "Microsoft Word";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, MicrosoftWordClient> = new Map();

    constructor() {
        super();

        // Register document operations
        this.registerOperation(getDocumentOperation);
        this.registerOperation(downloadDocumentOperation);
        this.registerOperation(convertDocumentOperation);
        this.registerOperation(uploadDocumentOperation);
        this.registerOperation(replaceDocumentOperation);
        this.registerOperation(searchDocumentsOperation);
        this.registerOperation(copyDocumentOperation);
        this.registerOperation(deleteDocumentOperation);
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
            case "getDocument":
                return await executeGetDocument(client, validatedParams as never);
            case "downloadDocument":
                return await executeDownloadDocument(client, validatedParams as never);
            case "convertDocument":
                return await executeConvertDocument(client, validatedParams as never);
            case "uploadDocument":
                return await executeUploadDocument(client, validatedParams as never);
            case "replaceDocument":
                return await executeReplaceDocument(client, validatedParams as never);
            case "searchDocuments":
                return await executeSearchDocuments(client, validatedParams as never);
            case "copyDocument":
                return await executeCopyDocument(client, validatedParams as never);
            case "deleteDocument":
                return await executeDeleteDocument(client, validatedParams as never);
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
            name: `microsoft_word_${op.id}`,
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
        const operationId = toolName.replace("microsoft_word_", "");

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
     * Get or create Word client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MicrosoftWordClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new MicrosoftWordClient({
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
