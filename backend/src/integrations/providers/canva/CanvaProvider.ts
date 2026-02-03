import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { CanvaClient } from "./client/CanvaClient";
import {
    listDesignsOperation,
    executeListDesigns,
    getDesignOperation,
    executeGetDesign,
    createDesignOperation,
    executeCreateDesign,
    listFoldersOperation,
    executeListFolders,
    createFolderOperation,
    executeCreateFolder,
    listAssetsOperation,
    executeListAssets,
    uploadAssetOperation,
    executeUploadAsset,
    exportDesignOperation,
    executeExportDesign
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
 * Canva Provider - implements OAuth2 authentication with REST API operations
 */
export class CanvaProvider extends BaseProvider {
    readonly name = "canva";
    readonly displayName = "Canva";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 20
        }
    };

    private clientPool: Map<string, CanvaClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listDesignsOperation);
        this.registerOperation(getDesignOperation);
        this.registerOperation(createDesignOperation);
        this.registerOperation(listFoldersOperation);
        this.registerOperation(createFolderOperation);
        this.registerOperation(listAssetsOperation);
        this.registerOperation(uploadAssetOperation);
        this.registerOperation(exportDesignOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://api.canva.com/oauth/authorize",
            tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
            scopes: [
                "design:content:read",
                "design:meta:read",
                "design:content:write",
                "folder:read",
                "folder:write",
                "asset:read",
                "asset:write"
            ],
            clientId: appConfig.oauth.canva.clientId,
            clientSecret: appConfig.oauth.canva.clientSecret,
            redirectUri: getOAuthRedirectUri("canva"),
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
            case "listDesigns":
                return await executeListDesigns(client, validatedParams as never);
            case "getDesign":
                return await executeGetDesign(client, validatedParams as never);
            case "createDesign":
                return await executeCreateDesign(client, validatedParams as never);
            case "listFolders":
                return await executeListFolders(client, validatedParams as never);
            case "createFolder":
                return await executeCreateFolder(client, validatedParams as never);
            case "listAssets":
                return await executeListAssets(client, validatedParams as never);
            case "uploadAsset":
                return await executeUploadAsset(client, validatedParams as never);
            case "exportDesign":
                return await executeExportDesign(client, validatedParams as never);
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
        // Convert operations to MCP tools with canva_ prefix
        return this.getOperations().map((op) => ({
            name: `canva_${op.id}`,
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
        // Remove canva_ prefix to get operation ID
        const operationId = toolName.replace("canva_", "");

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
     * Get or create Canva client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): CanvaClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new CanvaClient({
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
