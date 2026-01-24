import { BaseProvider } from "../../core/BaseProvider";
import { TrelloClient } from "./client/TrelloClient";
import { TrelloMCPAdapter } from "./mcp/TrelloMCPAdapter";
import {
    // Boards
    listBoardsOperation,
    executeListBoards,
    getBoardOperation,
    executeGetBoard,
    createBoardOperation,
    executeCreateBoard,
    updateBoardOperation,
    executeUpdateBoard,
    // Lists
    getListsOperation,
    executeGetLists,
    getListOperation,
    executeGetList,
    createListOperation,
    executeCreateList,
    updateListOperation,
    executeUpdateList,
    archiveListOperation,
    executeArchiveList,
    // Cards
    getCardsOperation,
    executeGetCards,
    getCardOperation,
    executeGetCard,
    createCardOperation,
    executeCreateCard,
    updateCardOperation,
    executeUpdateCard,
    deleteCardOperation,
    executeDeleteCard,
    moveCardOperation,
    executeMoveCard,
    // Comments
    addCommentOperation,
    executeAddComment,
    // Members
    getMeOperation,
    executeGetMe,
    getBoardMembersOperation,
    executeGetBoardMembers
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Trello Provider - implements API Key + Token authentication
 *
 * Trello uses query parameter authentication instead of headers:
 * - api_key field = Trello API Key
 * - api_secret field = Trello Token
 * Both are passed as ?key=xxx&token=yyy query parameters
 *
 * Rate limit: 100 requests per 10 seconds per token (600/min)
 */
export class TrelloProvider extends BaseProvider {
    readonly name = "trello";
    readonly displayName = "Trello";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private mcpAdapter: TrelloMCPAdapter;
    private clientPool: Map<string, TrelloClient> = new Map();

    constructor() {
        super();

        // Register board operations
        this.registerOperation(listBoardsOperation);
        this.registerOperation(getBoardOperation);
        this.registerOperation(createBoardOperation);
        this.registerOperation(updateBoardOperation);

        // Register list operations
        this.registerOperation(getListsOperation);
        this.registerOperation(getListOperation);
        this.registerOperation(createListOperation);
        this.registerOperation(updateListOperation);
        this.registerOperation(archiveListOperation);

        // Register card operations
        this.registerOperation(getCardsOperation);
        this.registerOperation(getCardOperation);
        this.registerOperation(createCardOperation);
        this.registerOperation(updateCardOperation);
        this.registerOperation(deleteCardOperation);
        this.registerOperation(moveCardOperation);

        // Register comment operations
        this.registerOperation(addCommentOperation);

        // Register member operations
        this.registerOperation(getMeOperation);
        this.registerOperation(getBoardMembersOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new TrelloMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Trello doesn't use header auth, but we provide this for interface compliance.
     * The TrelloClient handles the actual query param authentication.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
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
            // Boards
            case "listBoards":
                return await executeListBoards(client, validatedParams as never);
            case "getBoard":
                return await executeGetBoard(client, validatedParams as never);
            case "createBoard":
                return await executeCreateBoard(client, validatedParams as never);
            case "updateBoard":
                return await executeUpdateBoard(client, validatedParams as never);

            // Lists
            case "getLists":
                return await executeGetLists(client, validatedParams as never);
            case "getList":
                return await executeGetList(client, validatedParams as never);
            case "createList":
                return await executeCreateList(client, validatedParams as never);
            case "updateList":
                return await executeUpdateList(client, validatedParams as never);
            case "archiveList":
                return await executeArchiveList(client, validatedParams as never);

            // Cards
            case "getCards":
                return await executeGetCards(client, validatedParams as never);
            case "getCard":
                return await executeGetCard(client, validatedParams as never);
            case "createCard":
                return await executeCreateCard(client, validatedParams as never);
            case "updateCard":
                return await executeUpdateCard(client, validatedParams as never);
            case "deleteCard":
                return await executeDeleteCard(client, validatedParams as never);
            case "moveCard":
                return await executeMoveCard(client, validatedParams as never);

            // Comments
            case "addComment":
                return await executeAddComment(client, validatedParams as never);

            // Members
            case "getMe":
                return await executeGetMe(client, validatedParams as never);
            case "getBoardMembers":
                return await executeGetBoardMembers(client, validatedParams as never);

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
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create Trello client (with connection pooling)
     *
     * For Trello, we use:
     * - api_key field as the Trello API Key
     * - api_secret field as the Trello Token
     */
    private getOrCreateClient(connection: ConnectionWithData): TrelloClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new TrelloClient({
            apiKey: data.api_key,
            token: data.api_secret || ""
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
