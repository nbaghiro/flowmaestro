import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { MiroClient } from "./client/MiroClient";
import {
    listBoardsOperation,
    executeListBoards,
    getBoardOperation,
    executeGetBoard,
    createBoardOperation,
    executeCreateBoard,
    createStickyNoteOperation,
    executeCreateStickyNote,
    createCardOperation,
    executeCreateCard,
    createShapeOperation,
    executeCreateShape,
    getItemsOperation,
    executeGetItems,
    createTagOperation,
    executeCreateTag
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
 * Miro Provider - implements OAuth2 authentication with REST API operations
 */
export class MiroProvider extends BaseProvider {
    readonly name = "miro";
    readonly displayName = "Miro";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 100
        }
    };

    private clientPool: Map<string, MiroClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listBoardsOperation);
        this.registerOperation(getBoardOperation);
        this.registerOperation(createBoardOperation);
        this.registerOperation(createStickyNoteOperation);
        this.registerOperation(createCardOperation);
        this.registerOperation(createShapeOperation);
        this.registerOperation(getItemsOperation);
        this.registerOperation(createTagOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://miro.com/oauth/authorize",
            tokenUrl: "https://api.miro.com/v1/oauth/token",
            scopes: ["boards:read", "boards:write"],
            clientId: appConfig.oauth.miro.clientId,
            clientSecret: appConfig.oauth.miro.clientSecret,
            redirectUri: getOAuthRedirectUri("miro"),
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
            case "listBoards":
                return await executeListBoards(client, validatedParams as never);
            case "getBoard":
                return await executeGetBoard(client, validatedParams as never);
            case "createBoard":
                return await executeCreateBoard(client, validatedParams as never);
            case "createStickyNote":
                return await executeCreateStickyNote(client, validatedParams as never);
            case "createCard":
                return await executeCreateCard(client, validatedParams as never);
            case "createShape":
                return await executeCreateShape(client, validatedParams as never);
            case "getItems":
                return await executeGetItems(client, validatedParams as never);
            case "createTag":
                return await executeCreateTag(client, validatedParams as never);
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
        // Convert operations to MCP tools with miro_ prefix
        return this.getOperations().map((op) => ({
            name: `miro_${op.id}`,
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
        // Remove miro_ prefix to get operation ID
        const operationId = toolName.replace("miro_", "");

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
     * Get or create Miro client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MiroClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new MiroClient({
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
