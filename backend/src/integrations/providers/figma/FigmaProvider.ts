import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { FigmaClient } from "./client/FigmaClient";
import {
    getFileOperation,
    executeGetFile,
    getFileNodesOperation,
    executeGetFileNodes,
    getFileVersionsOperation,
    executeGetFileVersions,
    exportImagesOperation,
    executeExportImages,
    listCommentsOperation,
    executeListComments,
    createCommentOperation,
    executeCreateComment
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
 * Figma Provider - implements OAuth2 authentication with REST API operations
 */
export class FigmaProvider extends BaseProvider {
    readonly name = "figma";
    readonly displayName = "Figma";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 10 // Conservative estimate for Tier 1
        }
    };

    private clientPool: Map<string, FigmaClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(getFileOperation);
        this.registerOperation(getFileNodesOperation);
        this.registerOperation(getFileVersionsOperation);
        this.registerOperation(exportImagesOperation);
        this.registerOperation(listCommentsOperation);
        this.registerOperation(createCommentOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://www.figma.com/oauth",
            tokenUrl: "https://api.figma.com/v1/oauth/token",
            scopes: [
                "file_content:read",
                "file_metadata:read",
                "file_comments:read",
                "file_comments:write",
                "webhooks:write"
            ],
            clientId: appConfig.oauth.figma.clientId,
            clientSecret: appConfig.oauth.figma.clientSecret,
            redirectUri: getOAuthRedirectUri("figma"),
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
            case "getFile":
                return await executeGetFile(client, validatedParams as never);
            case "getFileNodes":
                return await executeGetFileNodes(client, validatedParams as never);
            case "getFileVersions":
                return await executeGetFileVersions(client, validatedParams as never);
            case "exportImages":
                return await executeExportImages(client, validatedParams as never);
            case "listComments":
                return await executeListComments(client, validatedParams as never);
            case "createComment":
                return await executeCreateComment(client, validatedParams as never);
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
        // Convert operations to MCP tools with figma_ prefix
        return this.getOperations().map((op) => ({
            name: `figma_${op.id}`,
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
        // Remove figma_ prefix to get operation ID
        const operationId = toolName.replace("figma_", "");

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
     * Get or create Figma client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): FigmaClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new FigmaClient({
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
