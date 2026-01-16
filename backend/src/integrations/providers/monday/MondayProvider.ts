import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { MondayClient } from "./client/MondayClient";
import { MondayMCPAdapter } from "./mcp/MondayMCPAdapter";
import {
    // Board Operations
    createBoardOperation,
    executeCreateBoard,
    getBoardOperation,
    executeGetBoard,
    updateBoardOperation,
    executeUpdateBoard,
    deleteBoardOperation,
    executeDeleteBoard,
    listBoardsOperation,
    executeListBoards,
    archiveBoardOperation,
    executeArchiveBoard,
    duplicateBoardOperation,
    executeDuplicateBoard,
    // Item Operations
    createItemOperation,
    executeCreateItem,
    getItemOperation,
    executeGetItem,
    updateItemOperation,
    executeUpdateItem,
    deleteItemOperation,
    executeDeleteItem,
    listItemsOperation,
    executeListItems,
    archiveItemOperation,
    executeArchiveItem,
    duplicateItemOperation,
    executeDuplicateItem,
    moveItemToGroupOperation,
    executeMoveItemToGroup,
    moveItemToBoardOperation,
    executeMoveItemToBoard,
    // Group Operations
    createGroupOperation,
    executeCreateGroup,
    updateGroupOperation,
    executeUpdateGroup,
    deleteGroupOperation,
    executeDeleteGroup,
    listGroupsOperation,
    executeListGroups,
    archiveGroupOperation,
    executeArchiveGroup,
    duplicateGroupOperation,
    executeDuplicateGroup,
    // Column Operations
    createColumnOperation,
    executeCreateColumn,
    deleteColumnOperation,
    executeDeleteColumn,
    listColumnsOperation,
    executeListColumns,
    changeColumnValueOperation,
    executeChangeColumnValue,
    changeSimpleColumnValueOperation,
    executeChangeSimpleColumnValue,
    // User Operations
    getCurrentUserOperation,
    executeGetCurrentUser,
    getUserOperation,
    executeGetUser,
    listUsersOperation,
    executeListUsers,
    // Workspace Operations
    listWorkspacesOperation,
    executeListWorkspaces,
    getWorkspaceOperation,
    executeGetWorkspace,
    // Team Operations
    listTeamsOperation,
    executeListTeams,
    // Tag Operations
    listTagsOperation,
    executeListTags,
    // Update Operations
    createUpdateOperation,
    executeCreateUpdate,
    listUpdatesOperation,
    executeListUpdates,
    deleteUpdateOperation,
    executeDeleteUpdate
} from "./operations";
import type {
    CreateBoardInput,
    GetBoardInput,
    UpdateBoardInput,
    DeleteBoardInput,
    ListBoardsInput,
    ArchiveBoardInput,
    DuplicateBoardInput,
    CreateItemInput,
    GetItemInput,
    UpdateItemInput,
    DeleteItemInput,
    ListItemsInput,
    ArchiveItemInput,
    DuplicateItemInput,
    MoveItemToGroupInput,
    MoveItemToBoardInput,
    CreateGroupInput,
    UpdateGroupInput,
    DeleteGroupInput,
    ListGroupsInput,
    ArchiveGroupInput,
    DuplicateGroupInput,
    CreateColumnInput,
    DeleteColumnInput,
    ListColumnsInput,
    ChangeColumnValueInput,
    ChangeSimpleColumnValueInput,
    GetCurrentUserInput,
    GetUserInput,
    ListUsersInput,
    ListWorkspacesInput,
    GetWorkspaceInput,
    ListTeamsInput,
    ListTagsInput,
    CreateUpdateInput,
    ListUpdatesInput,
    DeleteUpdateInput
} from "./schemas";
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
 * Monday.com Provider
 * Provides integration with Monday.com for project and work management
 */
export class MondayProvider extends BaseProvider {
    readonly name = "monday";
    readonly displayName = "Monday.com";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            // Monday.com has complexity-based rate limiting
            // Default is 10M complexity points per minute
            tokensPerMinute: 10000,
            burstSize: 100
        }
    };

    private clientPool: Map<string, MondayClient> = new Map();
    private mcpAdapter: MondayMCPAdapter;

    constructor() {
        super();

        // Register all operations

        // Board Operations (7)
        this.registerOperation(createBoardOperation);
        this.registerOperation(getBoardOperation);
        this.registerOperation(updateBoardOperation);
        this.registerOperation(deleteBoardOperation);
        this.registerOperation(listBoardsOperation);
        this.registerOperation(archiveBoardOperation);
        this.registerOperation(duplicateBoardOperation);

        // Item Operations (9)
        this.registerOperation(createItemOperation);
        this.registerOperation(getItemOperation);
        this.registerOperation(updateItemOperation);
        this.registerOperation(deleteItemOperation);
        this.registerOperation(listItemsOperation);
        this.registerOperation(archiveItemOperation);
        this.registerOperation(duplicateItemOperation);
        this.registerOperation(moveItemToGroupOperation);
        this.registerOperation(moveItemToBoardOperation);

        // Group Operations (6)
        this.registerOperation(createGroupOperation);
        this.registerOperation(updateGroupOperation);
        this.registerOperation(deleteGroupOperation);
        this.registerOperation(listGroupsOperation);
        this.registerOperation(archiveGroupOperation);
        this.registerOperation(duplicateGroupOperation);

        // Column Operations (5)
        this.registerOperation(createColumnOperation);
        this.registerOperation(deleteColumnOperation);
        this.registerOperation(listColumnsOperation);
        this.registerOperation(changeColumnValueOperation);
        this.registerOperation(changeSimpleColumnValueOperation);

        // User Operations (3)
        this.registerOperation(getCurrentUserOperation);
        this.registerOperation(getUserOperation);
        this.registerOperation(listUsersOperation);

        // Workspace Operations (2)
        this.registerOperation(listWorkspacesOperation);
        this.registerOperation(getWorkspaceOperation);

        // Team Operations (1)
        this.registerOperation(listTeamsOperation);

        // Tag Operations (1)
        this.registerOperation(listTagsOperation);

        // Update Operations (3)
        this.registerOperation(createUpdateOperation);
        this.registerOperation(listUpdatesOperation);
        this.registerOperation(deleteUpdateOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new MondayMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     * Note: Monday.com tokens do not expire and do not support refresh tokens
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://auth.monday.com/oauth2/authorize",
            tokenUrl: "https://auth.monday.com/oauth2/token",
            scopes: [
                "me:read",
                "boards:read",
                "boards:write",
                "workspaces:read",
                "users:read",
                "teams:read",
                "updates:read",
                "updates:write",
                "tags:read"
            ],
            clientId: appConfig.oauth.monday.clientId,
            clientSecret: appConfig.oauth.monday.clientSecret,
            redirectUri: getOAuthRedirectUri("monday"),
            refreshable: false // Monday.com tokens do not expire
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
            // Board Operations
            case "createBoard":
                return await executeCreateBoard(client, validatedParams as CreateBoardInput);
            case "getBoard":
                return await executeGetBoard(client, validatedParams as GetBoardInput);
            case "updateBoard":
                return await executeUpdateBoard(client, validatedParams as UpdateBoardInput);
            case "deleteBoard":
                return await executeDeleteBoard(client, validatedParams as DeleteBoardInput);
            case "listBoards":
                return await executeListBoards(client, validatedParams as ListBoardsInput);
            case "archiveBoard":
                return await executeArchiveBoard(client, validatedParams as ArchiveBoardInput);
            case "duplicateBoard":
                return await executeDuplicateBoard(client, validatedParams as DuplicateBoardInput);

            // Item Operations
            case "createItem":
                return await executeCreateItem(client, validatedParams as CreateItemInput);
            case "getItem":
                return await executeGetItem(client, validatedParams as GetItemInput);
            case "updateItem":
                return await executeUpdateItem(client, validatedParams as UpdateItemInput);
            case "deleteItem":
                return await executeDeleteItem(client, validatedParams as DeleteItemInput);
            case "listItems":
                return await executeListItems(client, validatedParams as ListItemsInput);
            case "archiveItem":
                return await executeArchiveItem(client, validatedParams as ArchiveItemInput);
            case "duplicateItem":
                return await executeDuplicateItem(client, validatedParams as DuplicateItemInput);
            case "moveItemToGroup":
                return await executeMoveItemToGroup(
                    client,
                    validatedParams as MoveItemToGroupInput
                );
            case "moveItemToBoard":
                return await executeMoveItemToBoard(
                    client,
                    validatedParams as MoveItemToBoardInput
                );

            // Group Operations
            case "createGroup":
                return await executeCreateGroup(client, validatedParams as CreateGroupInput);
            case "updateGroup":
                return await executeUpdateGroup(client, validatedParams as UpdateGroupInput);
            case "deleteGroup":
                return await executeDeleteGroup(client, validatedParams as DeleteGroupInput);
            case "listGroups":
                return await executeListGroups(client, validatedParams as ListGroupsInput);
            case "archiveGroup":
                return await executeArchiveGroup(client, validatedParams as ArchiveGroupInput);
            case "duplicateGroup":
                return await executeDuplicateGroup(client, validatedParams as DuplicateGroupInput);

            // Column Operations
            case "createColumn":
                return await executeCreateColumn(client, validatedParams as CreateColumnInput);
            case "deleteColumn":
                return await executeDeleteColumn(client, validatedParams as DeleteColumnInput);
            case "listColumns":
                return await executeListColumns(client, validatedParams as ListColumnsInput);
            case "changeColumnValue":
                return await executeChangeColumnValue(
                    client,
                    validatedParams as ChangeColumnValueInput
                );
            case "changeSimpleColumnValue":
                return await executeChangeSimpleColumnValue(
                    client,
                    validatedParams as ChangeSimpleColumnValueInput
                );

            // User Operations
            case "getCurrentUser":
                return await executeGetCurrentUser(client, validatedParams as GetCurrentUserInput);
            case "getUser":
                return await executeGetUser(client, validatedParams as GetUserInput);
            case "listUsers":
                return await executeListUsers(client, validatedParams as ListUsersInput);

            // Workspace Operations
            case "listWorkspaces":
                return await executeListWorkspaces(client, validatedParams as ListWorkspacesInput);
            case "getWorkspace":
                return await executeGetWorkspace(client, validatedParams as GetWorkspaceInput);

            // Team Operations
            case "listTeams":
                return await executeListTeams(client, validatedParams as ListTeamsInput);

            // Tag Operations
            case "listTags":
                return await executeListTags(client, validatedParams as ListTagsInput);

            // Update Operations
            case "createUpdate":
                return await executeCreateUpdate(client, validatedParams as CreateUpdateInput);
            case "listUpdates":
                return await executeListUpdates(client, validatedParams as ListUpdatesInput);
            case "deleteUpdate":
                return await executeDeleteUpdate(client, validatedParams as DeleteUpdateInput);

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

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Monday.com client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MondayClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Extract OAuth tokens
        const tokens = connection.data as OAuth2TokenData;

        // Create new client
        const client = new MondayClient({
            accessToken: tokens.access_token,
            connectionId: connection.id
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
