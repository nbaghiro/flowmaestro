import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { DropboxClient } from "./client/DropboxClient";
import {
    listFilesOperation,
    executeListFiles,
    uploadFileOperation,
    executeUploadFile,
    downloadFileOperation,
    executeDownloadFile,
    createFolderOperation,
    executeCreateFolder,
    deleteFileOperation,
    executeDeleteFile,
    shareFileOperation,
    executeShareFile
} from "./operations";
import type { CreateFolderParams } from "./operations/createFolder";
import type { DeleteFileParams } from "./operations/deleteFile";
import type { DownloadFileParams } from "./operations/downloadFile";
import type { ListFilesParams } from "./operations/listFiles";
import type { ShareFileParams } from "./operations/shareFile";
import type { UploadFileParams } from "./operations/uploadFile";
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
 * Dropbox Provider - implements OAuth2 authentication with file storage operations
 *
 * Provides access to Dropbox files, folders, and sharing functionality.
 *
 * Documentation: https://www.dropbox.com/developers/documentation/http/documentation
 */
export class DropboxProvider extends BaseProvider {
    readonly name = "dropbox";
    readonly displayName = "Dropbox";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 300 // Dropbox allows ~300 requests/min
        }
    };

    private clientPool: Map<string, DropboxClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listFilesOperation);
        this.registerOperation(uploadFileOperation);
        this.registerOperation(downloadFileOperation);
        this.registerOperation(createFolderOperation);
        this.registerOperation(deleteFileOperation);
        this.registerOperation(shareFileOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.dropbox.com/oauth2/authorize",
            tokenUrl: "https://api.dropboxapi.com/oauth2/token",
            scopes: [
                "account_info.read",
                "files.content.write",
                "files.content.read",
                "files.metadata.write",
                "files.metadata.read",
                "sharing.write",
                "sharing.read"
            ],
            clientId: appConfig.oauth.dropbox.clientId,
            clientSecret: appConfig.oauth.dropbox.clientSecret,
            redirectUri: getOAuthRedirectUri("dropbox"),
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
            case "listFiles":
                return await executeListFiles(client, validatedParams as ListFilesParams);
            case "uploadFile":
                return await executeUploadFile(client, validatedParams as UploadFileParams);
            case "downloadFile":
                return await executeDownloadFile(client, validatedParams as DownloadFileParams);
            case "createFolder":
                return await executeCreateFolder(client, validatedParams as CreateFolderParams);
            case "deleteFile":
                return await executeDeleteFile(client, validatedParams as DeleteFileParams);
            case "shareFile":
                return await executeShareFile(client, validatedParams as ShareFileParams);
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
        // Convert operations to MCP tools with dropbox_ prefix
        return this.getOperations().map((op) => ({
            name: `dropbox_${op.id}`,
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
        // Remove dropbox_ prefix to get operation ID
        const operationId = toolName.replace("dropbox_", "");

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
     * Get or create Dropbox client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): DropboxClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new DropboxClient({
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
