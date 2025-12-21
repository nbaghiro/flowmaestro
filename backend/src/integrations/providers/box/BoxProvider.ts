import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { BoxClient } from "./client/BoxClient";
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
 * Box Provider - implements OAuth2 authentication with file storage operations
 *
 * Provides access to Box files, folders, and sharing functionality.
 *
 * Documentation: https://developer.box.com/reference
 */
export class BoxProvider extends BaseProvider {
    readonly name = "box";
    readonly displayName = "Box";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 1000 // Box allows ~1000 requests/min for most endpoints
        }
    };

    private clientPool: Map<string, BoxClient> = new Map();

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
            authUrl: "https://account.box.com/api/oauth2/authorize",
            tokenUrl: "https://api.box.com/oauth2/token",
            scopes: [], // Box uses application scopes configured in Developer Console
            clientId: appConfig.oauth.box.clientId,
            clientSecret: appConfig.oauth.box.clientSecret,
            redirectUri: getOAuthRedirectUri("box"),
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
        // Convert operations to MCP tools with box_ prefix
        return this.getOperations().map((op) => ({
            name: `box_${op.id}`,
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
        // Remove box_ prefix to get operation ID
        const operationId = toolName.replace("box_", "");

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
     * Get or create Box client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): BoxClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new BoxClient({
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
