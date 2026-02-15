/**
 * Monday Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Board operations
import { executeCreateBoard } from "../operations/boards/createBoard";
import { executeDeleteBoard } from "../operations/boards/deleteBoard";
import { executeGetBoard } from "../operations/boards/getBoard";
import { executeListBoards } from "../operations/boards/listBoards";

// Item operations
import { executeCreateColumn } from "../operations/columns/createColumn";
import { executeCreateGroup } from "../operations/groups/createGroup";
import { executeListGroups } from "../operations/groups/listGroups";
import { executeCreateItem } from "../operations/items/createItem";
import { executeDeleteItem } from "../operations/items/deleteItem";
import { executeGetItem } from "../operations/items/getItem";
import { executeListItems } from "../operations/items/listItems";
import { executeUpdateItem } from "../operations/items/updateItem";

// Group operations

// Column operations

// User operations
import { executeCreateUpdate } from "../operations/updates/createUpdate";
import { executeListUpdates } from "../operations/updates/listUpdates";
import { executeGetCurrentUser } from "../operations/users/getCurrentUser";
import { executeListUsers } from "../operations/users/listUsers";

// Workspace operations
import { executeListWorkspaces } from "../operations/workspaces/listWorkspaces";

// Update operations

// Schemas
import {
    listBoardsInputSchema,
    createBoardInputSchema,
    getBoardInputSchema,
    deleteBoardInputSchema,
    createItemInputSchema,
    getItemInputSchema,
    updateItemInputSchema,
    deleteItemInputSchema,
    listItemsInputSchema,
    createGroupInputSchema,
    listGroupsInputSchema,
    createColumnInputSchema,
    getCurrentUserInputSchema,
    listUsersInputSchema,
    listWorkspacesInputSchema,
    createUpdateInputSchema,
    listUpdatesInputSchema
} from "../schemas";

import type { MondayClient } from "../client/MondayClient";

// Mock MondayClient factory
function createMockMondayClient(): jest.Mocked<MondayClient> {
    return {
        query: jest.fn(),
        mutation: jest.fn(),
        stringifyColumnValues: jest.fn((values) => JSON.stringify(values)),
        parseColumnValues: jest.fn((str) => JSON.parse(str))
    } as unknown as jest.Mocked<MondayClient>;
}

describe("Monday Operation Executors", () => {
    let mockClient: jest.Mocked<MondayClient>;

    beforeEach(() => {
        mockClient = createMockMondayClient();
    });

    // ========================================================================
    // BOARD OPERATIONS
    // ========================================================================

    describe("executeListBoards", () => {
        it("calls client with correct params", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: []
            });

            await executeListBoards(mockClient, { limit: 25 });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), { limit: 25 });
        });

        it("returns normalized output on success", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        id: "123",
                        name: "Test Board",
                        description: "A test board",
                        state: "active",
                        board_kind: "public",
                        board_folder_id: null,
                        workspace_id: "456",
                        permissions: "everyone"
                    },
                    {
                        id: "789",
                        name: "Another Board",
                        description: null,
                        state: "active",
                        board_kind: "private",
                        board_folder_id: "folder1",
                        workspace_id: "456",
                        permissions: "you"
                    }
                ]
            });

            const result = await executeListBoards(mockClient, { limit: 25 });

            expect(result.success).toBe(true);
            expect(result.data?.boards).toHaveLength(2);
            expect(result.data?.boards[0]).toEqual({
                id: "123",
                name: "Test Board",
                description: "A test board",
                state: "active",
                board_kind: "public",
                board_folder_id: null,
                workspace_id: "456",
                permissions: "everyone"
            });
            expect(result.data?.count).toBe(2);
        });

        it("passes optional filters", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: []
            });

            await executeListBoards(mockClient, {
                limit: 50,
                workspace_ids: ["ws1", "ws2"],
                board_kind: "private",
                state: "active",
                page: 2
            });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                limit: 50,
                workspace_ids: ["ws1", "ws2"],
                board_kind: "private",
                state: "active",
                page: 2
            });
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("API rate limit exceeded"));

            const result = await executeListBoards(mockClient, { limit: 25 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("API rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.query.mockRejectedValueOnce("string error");

            const result = await executeListBoards(mockClient, { limit: 25 });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list boards");
        });
    });

    describe("executeCreateBoard", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_board: {
                    id: "123",
                    name: "New Board",
                    description: "Description",
                    state: "active",
                    board_kind: "public",
                    workspace_id: null
                }
            });

            await executeCreateBoard(mockClient, {
                board_name: "New Board",
                board_kind: "public"
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_name: "New Board",
                board_kind: "public"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_board: {
                    id: "123",
                    name: "New Board",
                    description: "A brand new board",
                    state: "active",
                    board_kind: "public",
                    workspace_id: "ws1"
                }
            });

            const result = await executeCreateBoard(mockClient, {
                board_name: "New Board",
                board_kind: "public",
                description: "A brand new board",
                workspace_id: "ws1"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "123",
                name: "New Board",
                description: "A brand new board",
                state: "active",
                board_kind: "public",
                workspace_id: "ws1"
            });
        });

        it("passes optional parameters", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_board: {
                    id: "123",
                    name: "Template Board",
                    description: null,
                    state: "active",
                    board_kind: "private",
                    workspace_id: "ws1"
                }
            });

            await executeCreateBoard(mockClient, {
                board_name: "Template Board",
                board_kind: "private",
                workspace_id: "ws1",
                folder_id: "folder1",
                template_id: "template1"
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_name: "Template Board",
                board_kind: "private",
                workspace_id: "ws1",
                folder_id: "folder1",
                template_id: "template1"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Insufficient permissions"));

            const result = await executeCreateBoard(mockClient, {
                board_name: "New Board",
                board_kind: "public"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Insufficient permissions");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetBoard", () => {
        it("calls client with correct params", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        id: "123",
                        name: "Test Board",
                        description: null,
                        state: "active",
                        board_kind: "public",
                        board_folder_id: null,
                        workspace_id: null,
                        permissions: "everyone",
                        columns: [],
                        groups: [],
                        owners: []
                    }
                ]
            });

            await executeGetBoard(mockClient, { board_id: "123" });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), { board_id: "123" });
        });

        it("returns normalized output on success", async () => {
            const boardData = {
                id: "123",
                name: "Test Board",
                description: "Test description",
                state: "active",
                board_kind: "public",
                board_folder_id: "folder1",
                workspace_id: "ws1",
                permissions: "everyone",
                columns: [{ id: "col1", title: "Status", type: "status", settings_str: "{}" }],
                groups: [{ id: "grp1", title: "Group 1", color: "#FF0000", position: "0" }],
                owners: [{ id: "user1", name: "John Doe", email: "john@example.com" }]
            };

            mockClient.query.mockResolvedValueOnce({
                boards: [boardData]
            });

            const result = await executeGetBoard(mockClient, { board_id: "123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(boardData);
        });

        it("returns not_found error when board does not exist", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: []
            });

            const result = await executeGetBoard(mockClient, { board_id: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Board with ID nonexistent not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeGetBoard(mockClient, { board_id: "123" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeDeleteBoard", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                delete_board: { id: "123" }
            });

            await executeDeleteBoard(mockClient, { board_id: "123" });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "123"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                delete_board: { id: "123" }
            });

            const result = await executeDeleteBoard(mockClient, { board_id: "123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                board_id: "123"
            });
        });

        it("returns error on client failure (not retryable)", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Board not found"));

            const result = await executeDeleteBoard(mockClient, { board_id: "123" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Board not found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ========================================================================
    // ITEM OPERATIONS
    // ========================================================================

    describe("executeCreateItem", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_item: {
                    id: "item123",
                    name: "New Task",
                    state: "active",
                    board: { id: "board123", name: "Test Board" },
                    group: { id: "grp1", title: "To Do" }
                }
            });

            await executeCreateItem(mockClient, {
                board_id: "board123",
                item_name: "New Task"
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                item_name: "New Task"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_item: {
                    id: "item123",
                    name: "New Task",
                    state: "active",
                    board: { id: "board123", name: "Test Board" },
                    group: { id: "grp1", title: "To Do" }
                }
            });

            const result = await executeCreateItem(mockClient, {
                board_id: "board123",
                item_name: "New Task"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "item123",
                name: "New Task",
                state: "active",
                board: { id: "board123", name: "Test Board" },
                group: { id: "grp1", title: "To Do" }
            });
        });

        it("passes group_id and column_values", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_item: {
                    id: "item123",
                    name: "Task with values",
                    state: "active",
                    board: { id: "board123", name: "Test Board" },
                    group: { id: "grp2", title: "In Progress" }
                }
            });

            const columnValues = { status: { label: "Working" }, text: "Some text" };

            await executeCreateItem(mockClient, {
                board_id: "board123",
                item_name: "Task with values",
                group_id: "grp2",
                column_values: columnValues
            });

            expect(mockClient.stringifyColumnValues).toHaveBeenCalledWith(columnValues);
            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                item_name: "Task with values",
                group_id: "grp2",
                column_values: JSON.stringify(columnValues)
            });
        });

        it("returns error on client failure", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Invalid board ID"));

            const result = await executeCreateItem(mockClient, {
                board_id: "invalid",
                item_name: "New Task"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid board ID");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetItem", () => {
        it("calls client with correct params", async () => {
            mockClient.query.mockResolvedValueOnce({
                items: [
                    {
                        id: "item123",
                        name: "Test Item",
                        state: "active",
                        board: { id: "board123", name: "Test Board" },
                        group: { id: "grp1", title: "To Do" },
                        column_values: [],
                        creator: { id: "user1", name: "John", email: "john@example.com" },
                        created_at: "2024-01-01T00:00:00Z",
                        updated_at: null
                    }
                ]
            });

            await executeGetItem(mockClient, { item_id: "item123" });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                item_id: "item123"
            });
        });

        it("returns normalized output on success", async () => {
            const itemData = {
                id: "item123",
                name: "Test Item",
                state: "active",
                board: { id: "board123", name: "Test Board" },
                group: { id: "grp1", title: "To Do" },
                column_values: [
                    { id: "status", type: "status", text: "Working", value: '{"index":1}' }
                ],
                creator: { id: "user1", name: "John", email: "john@example.com" },
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-02T00:00:00Z"
            };

            mockClient.query.mockResolvedValueOnce({
                items: [itemData]
            });

            const result = await executeGetItem(mockClient, { item_id: "item123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(itemData);
        });

        it("returns not_found error when item does not exist", async () => {
            mockClient.query.mockResolvedValueOnce({
                items: []
            });

            const result = await executeGetItem(mockClient, { item_id: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("not_found");
            expect(result.error?.message).toBe("Item with ID nonexistent not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Unauthorized"));

            const result = await executeGetItem(mockClient, { item_id: "item123" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Unauthorized");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeUpdateItem", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                change_multiple_column_values: {
                    id: "item123",
                    name: "Test Item",
                    column_values: []
                }
            });

            const columnValues = { status: { label: "Done" } };

            await executeUpdateItem(mockClient, {
                board_id: "board123",
                item_id: "item123",
                column_values: columnValues
            });

            expect(mockClient.stringifyColumnValues).toHaveBeenCalledWith(columnValues);
            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                item_id: "item123",
                column_values: JSON.stringify(columnValues)
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                change_multiple_column_values: {
                    id: "item123",
                    name: "Updated Item",
                    column_values: [
                        { id: "status", type: "status", text: "Done", value: '{"index":2}' }
                    ]
                }
            });

            const result = await executeUpdateItem(mockClient, {
                board_id: "board123",
                item_id: "item123",
                column_values: { status: { label: "Done" } }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "item123",
                name: "Updated Item",
                column_values: [
                    { id: "status", type: "status", text: "Done", value: '{"index":2}' }
                ]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Invalid column ID"));

            const result = await executeUpdateItem(mockClient, {
                board_id: "board123",
                item_id: "item123",
                column_values: { invalid_col: "value" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid column ID");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeDeleteItem", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                delete_item: { id: "item123" }
            });

            await executeDeleteItem(mockClient, { item_id: "item123" });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                item_id: "item123"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                delete_item: { id: "item123" }
            });

            const result = await executeDeleteItem(mockClient, { item_id: "item123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                item_id: "item123"
            });
        });

        it("returns error on client failure (not retryable)", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Item not found"));

            const result = await executeDeleteItem(mockClient, { item_id: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Item not found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeListItems", () => {
        it("calls client with correct params for board-level listing", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        items_page: {
                            cursor: null,
                            items: []
                        }
                    }
                ]
            });

            await executeListItems(mockClient, {
                board_id: "board123",
                limit: 100
            });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                limit: 100,
                cursor: undefined
            });
        });

        it("calls client with correct params for group-level listing", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        groups: [
                            {
                                items_page: {
                                    cursor: null,
                                    items: []
                                }
                            }
                        ]
                    }
                ]
            });

            await executeListItems(mockClient, {
                board_id: "board123",
                group_id: "grp1",
                limit: 50
            });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                group_id: "grp1",
                limit: 50,
                cursor: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const items = [
                {
                    id: "item1",
                    name: "Task 1",
                    state: "active",
                    group: { id: "grp1", title: "To Do" },
                    column_values: [],
                    created_at: "2024-01-01T00:00:00Z",
                    updated_at: null
                },
                {
                    id: "item2",
                    name: "Task 2",
                    state: "active",
                    group: { id: "grp1", title: "To Do" },
                    column_values: [],
                    created_at: "2024-01-02T00:00:00Z",
                    updated_at: null
                }
            ];

            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        items_page: {
                            cursor: "next_cursor_123",
                            items
                        }
                    }
                ]
            });

            const result = await executeListItems(mockClient, {
                board_id: "board123",
                limit: 100
            });

            expect(result.success).toBe(true);
            expect(result.data?.items).toEqual(items);
            expect(result.data?.count).toBe(2);
            expect(result.data?.cursor).toBe("next_cursor_123");
            expect(result.data?.board_id).toBe("board123");
        });

        it("handles pagination with cursor", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        items_page: {
                            cursor: null,
                            items: []
                        }
                    }
                ]
            });

            await executeListItems(mockClient, {
                board_id: "board123",
                limit: 100,
                cursor: "prev_cursor_123"
            });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                limit: 100,
                cursor: "prev_cursor_123"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Board not accessible"));

            const result = await executeListItems(mockClient, {
                board_id: "board123",
                limit: 100
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Board not accessible");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================================================
    // GROUP OPERATIONS
    // ========================================================================

    describe("executeCreateGroup", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_group: {
                    id: "grp123",
                    title: "New Group",
                    color: "#FF0000",
                    position: "0"
                }
            });

            await executeCreateGroup(mockClient, {
                board_id: "board123",
                group_name: "New Group"
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                group_name: "New Group"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_group: {
                    id: "grp123",
                    title: "New Group",
                    color: "#00FF00",
                    position: "1"
                }
            });

            const result = await executeCreateGroup(mockClient, {
                board_id: "board123",
                group_name: "New Group",
                group_color: "00FF00"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "grp123",
                title: "New Group",
                color: "#00FF00",
                position: "1"
            });
        });

        it("passes optional parameters", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_group: {
                    id: "grp123",
                    title: "Positioned Group",
                    color: "#0000FF",
                    position: "2"
                }
            });

            await executeCreateGroup(mockClient, {
                board_id: "board123",
                group_name: "Positioned Group",
                group_color: "0000FF",
                position: "grp_existing",
                position_relative_method: "after_at"
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                group_name: "Positioned Group",
                group_color: "0000FF",
                position: "grp_existing",
                position_relative_method: "after_at"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeCreateGroup(mockClient, {
                board_id: "board123",
                group_name: "New Group"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListGroups", () => {
        it("calls client with correct params", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        groups: []
                    }
                ]
            });

            await executeListGroups(mockClient, { board_id: "board123" });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123"
            });
        });

        it("returns normalized output on success", async () => {
            const groups = [
                { id: "grp1", title: "To Do", color: "#FF0000", position: "0", archived: false },
                {
                    id: "grp2",
                    title: "In Progress",
                    color: "#FFFF00",
                    position: "1",
                    archived: false
                },
                { id: "grp3", title: "Done", color: "#00FF00", position: "2", archived: false }
            ];

            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        groups
                    }
                ]
            });

            const result = await executeListGroups(mockClient, { board_id: "board123" });

            expect(result.success).toBe(true);
            expect(result.data?.groups).toEqual(groups);
            expect(result.data?.count).toBe(3);
            expect(result.data?.board_id).toBe("board123");
        });

        it("handles empty groups array", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [
                    {
                        groups: []
                    }
                ]
            });

            const result = await executeListGroups(mockClient, { board_id: "board123" });

            expect(result.success).toBe(true);
            expect(result.data?.groups).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("handles missing groups field", async () => {
            mockClient.query.mockResolvedValueOnce({
                boards: [{}]
            });

            const result = await executeListGroups(mockClient, { board_id: "board123" });

            expect(result.success).toBe(true);
            expect(result.data?.groups).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Board not found"));

            const result = await executeListGroups(mockClient, { board_id: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Board not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================================================
    // COLUMN OPERATIONS
    // ========================================================================

    describe("executeCreateColumn", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_column: {
                    id: "col123",
                    title: "New Status",
                    type: "status",
                    description: null,
                    settings_str: "{}"
                }
            });

            await executeCreateColumn(mockClient, {
                board_id: "board123",
                title: "New Status",
                column_type: "status"
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                title: "New Status",
                column_type: "status"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_column: {
                    id: "col123",
                    title: "Priority",
                    type: "dropdown",
                    description: "Priority level",
                    settings_str: '{"labels":[{"id":1,"name":"High"},{"id":2,"name":"Low"}]}'
                }
            });

            const result = await executeCreateColumn(mockClient, {
                board_id: "board123",
                title: "Priority",
                column_type: "dropdown",
                description: "Priority level"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "col123",
                title: "Priority",
                type: "dropdown",
                description: "Priority level",
                settings_str: '{"labels":[{"id":1,"name":"High"},{"id":2,"name":"Low"}]}'
            });
        });

        it("passes optional parameters", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_column: {
                    id: "col123",
                    title: "Status",
                    type: "status",
                    description: "Task status",
                    settings_str: '{"labels":{}}'
                }
            });

            const defaults = { labels: { 0: "Not Started", 1: "In Progress", 2: "Done" } };

            await executeCreateColumn(mockClient, {
                board_id: "board123",
                title: "Status",
                column_type: "status",
                description: "Task status",
                defaults
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                board_id: "board123",
                title: "Status",
                column_type: "status",
                description: "Task status",
                defaults: JSON.stringify(defaults)
            });
        });

        it("returns error on client failure", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Column limit reached"));

            const result = await executeCreateColumn(mockClient, {
                board_id: "board123",
                title: "New Column",
                column_type: "text"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Column limit reached");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================================================
    // USER OPERATIONS
    // ========================================================================

    describe("executeGetCurrentUser", () => {
        it("calls client without params", async () => {
            mockClient.query.mockResolvedValueOnce({
                me: {
                    id: "user123",
                    name: "John Doe",
                    email: "john@example.com",
                    photo_thumb: "https://example.com/photo.jpg",
                    title: "Developer",
                    account: { id: "acc1", name: "My Company", slug: "my-company" },
                    teams: [{ id: "team1", name: "Engineering" }]
                }
            });

            await executeGetCurrentUser(mockClient, {});

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String));
        });

        it("returns normalized output on success", async () => {
            const userData = {
                id: "user123",
                name: "John Doe",
                email: "john@example.com",
                photo_thumb: "https://example.com/photo.jpg",
                title: "Developer",
                account: { id: "acc1", name: "My Company", slug: "my-company" },
                teams: [
                    { id: "team1", name: "Engineering" },
                    { id: "team2", name: "Product" }
                ]
            };

            mockClient.query.mockResolvedValueOnce({
                me: userData
            });

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ user: userData });
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Invalid token"));

            const result = await executeGetCurrentUser(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid token");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListUsers", () => {
        it("calls client with correct params", async () => {
            mockClient.query.mockResolvedValueOnce({
                users: []
            });

            await executeListUsers(mockClient, { limit: 50 });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                kind: undefined,
                limit: 50,
                page: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const users = [
                {
                    id: "user1",
                    name: "John Doe",
                    email: "john@example.com",
                    photo_thumb: "https://example.com/john.jpg",
                    title: "Developer",
                    enabled: true,
                    is_admin: false,
                    is_guest: false,
                    created_at: "2024-01-01T00:00:00Z"
                },
                {
                    id: "user2",
                    name: "Jane Smith",
                    email: "jane@example.com",
                    photo_thumb: null,
                    title: "Manager",
                    enabled: true,
                    is_admin: true,
                    is_guest: false,
                    created_at: "2024-01-02T00:00:00Z"
                }
            ];

            mockClient.query.mockResolvedValueOnce({ users });

            const result = await executeListUsers(mockClient, { limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data?.users).toEqual(users);
            expect(result.data?.count).toBe(2);
        });

        it("passes optional filters", async () => {
            mockClient.query.mockResolvedValueOnce({ users: [] });

            await executeListUsers(mockClient, {
                kind: "non_guests",
                limit: 25,
                page: 2
            });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                kind: "non_guests",
                limit: 25,
                page: 2
            });
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Insufficient permissions"));

            const result = await executeListUsers(mockClient, { limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Insufficient permissions");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================================================
    // WORKSPACE OPERATIONS
    // ========================================================================

    describe("executeListWorkspaces", () => {
        it("calls client with correct params", async () => {
            mockClient.query.mockResolvedValueOnce({
                workspaces: []
            });

            await executeListWorkspaces(mockClient, { limit: 50 });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                limit: 50,
                page: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const workspaces = [
                {
                    id: "ws1",
                    name: "Main Workspace",
                    kind: "open",
                    description: "Main workspace",
                    state: "active"
                },
                {
                    id: "ws2",
                    name: "Private Workspace",
                    kind: "closed",
                    description: null,
                    state: "active"
                }
            ];

            mockClient.query.mockResolvedValueOnce({ workspaces });

            const result = await executeListWorkspaces(mockClient, { limit: 50 });

            expect(result.success).toBe(true);
            expect(result.data?.workspaces).toEqual(workspaces);
            expect(result.data?.count).toBe(2);
        });

        it("handles pagination", async () => {
            mockClient.query.mockResolvedValueOnce({ workspaces: [] });

            await executeListWorkspaces(mockClient, { limit: 25, page: 3 });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                limit: 25,
                page: 3
            });
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Service unavailable"));

            const result = await executeListWorkspaces(mockClient, { limit: 50 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Service unavailable");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================================================
    // UPDATE (COMMENT) OPERATIONS
    // ========================================================================

    describe("executeCreateUpdate", () => {
        it("calls client with correct params", async () => {
            mockClient.mutation.mockResolvedValueOnce({
                create_update: {
                    id: "update123",
                    body: "<p>This is a comment</p>",
                    text_body: "This is a comment",
                    created_at: "2024-01-01T00:00:00Z",
                    creator: { id: "user1", name: "John Doe" }
                }
            });

            await executeCreateUpdate(mockClient, {
                item_id: "item123",
                body: "This is a comment"
            });

            expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {
                item_id: "item123",
                body: "This is a comment"
            });
        });

        it("returns normalized output on success", async () => {
            const updateData = {
                id: "update123",
                body: "<p>Great progress!</p>",
                text_body: "Great progress!",
                created_at: "2024-01-15T10:30:00Z",
                creator: { id: "user1", name: "Jane Smith" }
            };

            mockClient.mutation.mockResolvedValueOnce({
                create_update: updateData
            });

            const result = await executeCreateUpdate(mockClient, {
                item_id: "item123",
                body: "Great progress!"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ update: updateData });
        });

        it("returns error on client failure", async () => {
            mockClient.mutation.mockRejectedValueOnce(new Error("Item not found"));

            const result = await executeCreateUpdate(mockClient, {
                item_id: "nonexistent",
                body: "Comment"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Item not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeListUpdates", () => {
        it("calls client with correct params", async () => {
            mockClient.query.mockResolvedValueOnce({
                items: [
                    {
                        updates: []
                    }
                ]
            });

            await executeListUpdates(mockClient, { item_id: "item123", limit: 25 });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                item_id: "item123",
                limit: 25,
                page: undefined
            });
        });

        it("returns normalized output on success", async () => {
            const updates = [
                {
                    id: "upd1",
                    body: "<p>First comment</p>",
                    text_body: "First comment",
                    created_at: "2024-01-01T10:00:00Z",
                    updated_at: "2024-01-01T10:00:00Z",
                    creator: { id: "user1", name: "John", email: "john@example.com" }
                },
                {
                    id: "upd2",
                    body: "<p>Second comment</p>",
                    text_body: "Second comment",
                    created_at: "2024-01-02T11:00:00Z",
                    updated_at: "2024-01-02T11:30:00Z",
                    creator: { id: "user2", name: "Jane", email: "jane@example.com" }
                }
            ];

            mockClient.query.mockResolvedValueOnce({
                items: [
                    {
                        updates
                    }
                ]
            });

            const result = await executeListUpdates(mockClient, { item_id: "item123", limit: 25 });

            expect(result.success).toBe(true);
            expect(result.data?.updates).toEqual(updates);
            expect(result.data?.count).toBe(2);
            expect(result.data?.item_id).toBe("item123");
        });

        it("handles pagination", async () => {
            mockClient.query.mockResolvedValueOnce({
                items: [{ updates: [] }]
            });

            await executeListUpdates(mockClient, { item_id: "item123", limit: 10, page: 2 });

            expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {
                item_id: "item123",
                limit: 10,
                page: 2
            });
        });

        it("handles empty updates", async () => {
            mockClient.query.mockResolvedValueOnce({
                items: [{ updates: [] }]
            });

            const result = await executeListUpdates(mockClient, { item_id: "item123", limit: 25 });

            expect(result.success).toBe(true);
            expect(result.data?.updates).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("handles missing updates field", async () => {
            mockClient.query.mockResolvedValueOnce({
                items: [{}]
            });

            const result = await executeListUpdates(mockClient, { item_id: "item123", limit: 25 });

            expect(result.success).toBe(true);
            expect(result.data?.updates).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.query.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const result = await executeListUpdates(mockClient, { item_id: "item123", limit: 25 });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ========================================================================
    // SCHEMA VALIDATION TESTS
    // ========================================================================

    describe("schema validation", () => {
        describe("listBoardsInputSchema", () => {
            it("validates empty input (defaults applied)", () => {
                const result = listBoardsInputSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.limit).toBe(25);
                }
            });

            it("validates full input", () => {
                const result = listBoardsInputSchema.safeParse({
                    workspace_ids: ["ws1", "ws2"],
                    board_kind: "private",
                    state: "active",
                    limit: 50,
                    page: 2
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid board_kind", () => {
                const result = listBoardsInputSchema.safeParse({
                    board_kind: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit > 100", () => {
                const result = listBoardsInputSchema.safeParse({
                    limit: 200
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit < 1", () => {
                const result = listBoardsInputSchema.safeParse({
                    limit: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createBoardInputSchema", () => {
            it("validates minimal input", () => {
                const result = createBoardInputSchema.safeParse({
                    board_name: "Test Board",
                    board_kind: "public"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createBoardInputSchema.safeParse({
                    board_name: "Test Board",
                    board_kind: "private",
                    description: "A test board",
                    workspace_id: "ws1",
                    folder_id: "folder1",
                    template_id: "template1"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing board_name", () => {
                const result = createBoardInputSchema.safeParse({
                    board_kind: "public"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing board_kind", () => {
                const result = createBoardInputSchema.safeParse({
                    board_name: "Test Board"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid board_kind", () => {
                const result = createBoardInputSchema.safeParse({
                    board_name: "Test Board",
                    board_kind: "invalid"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty board_name", () => {
                const result = createBoardInputSchema.safeParse({
                    board_name: "",
                    board_kind: "public"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getBoardInputSchema", () => {
            it("validates with board_id", () => {
                const result = getBoardInputSchema.safeParse({
                    board_id: "123456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing board_id", () => {
                const result = getBoardInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("deleteBoardInputSchema", () => {
            it("validates with board_id", () => {
                const result = deleteBoardInputSchema.safeParse({
                    board_id: "123456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing board_id", () => {
                const result = deleteBoardInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createItemInputSchema", () => {
            it("validates minimal input", () => {
                const result = createItemInputSchema.safeParse({
                    board_id: "123",
                    item_name: "New Item"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createItemInputSchema.safeParse({
                    board_id: "123",
                    item_name: "New Item",
                    group_id: "grp1",
                    column_values: { status: { label: "Working" } }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing board_id", () => {
                const result = createItemInputSchema.safeParse({
                    item_name: "New Item"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty item_name", () => {
                const result = createItemInputSchema.safeParse({
                    board_id: "123",
                    item_name: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getItemInputSchema", () => {
            it("validates with item_id", () => {
                const result = getItemInputSchema.safeParse({
                    item_id: "item123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing item_id", () => {
                const result = getItemInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("updateItemInputSchema", () => {
            it("validates with required fields", () => {
                const result = updateItemInputSchema.safeParse({
                    board_id: "board123",
                    item_id: "item123",
                    column_values: { status: { label: "Done" } }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing board_id", () => {
                const result = updateItemInputSchema.safeParse({
                    item_id: "item123",
                    column_values: {}
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing column_values", () => {
                const result = updateItemInputSchema.safeParse({
                    board_id: "board123",
                    item_id: "item123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteItemInputSchema", () => {
            it("validates with item_id", () => {
                const result = deleteItemInputSchema.safeParse({
                    item_id: "item123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing item_id", () => {
                const result = deleteItemInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listItemsInputSchema", () => {
            it("validates minimal input", () => {
                const result = listItemsInputSchema.safeParse({
                    board_id: "board123"
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.limit).toBe(100);
                }
            });

            it("validates full input", () => {
                const result = listItemsInputSchema.safeParse({
                    board_id: "board123",
                    group_id: "grp1",
                    limit: 50,
                    cursor: "cursor123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects limit > 500", () => {
                const result = listItemsInputSchema.safeParse({
                    board_id: "board123",
                    limit: 1000
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createGroupInputSchema", () => {
            it("validates minimal input", () => {
                const result = createGroupInputSchema.safeParse({
                    board_id: "board123",
                    group_name: "New Group"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createGroupInputSchema.safeParse({
                    board_id: "board123",
                    group_name: "New Group",
                    group_color: "FF0000",
                    position: "grp_existing",
                    position_relative_method: "after_at"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid position_relative_method", () => {
                const result = createGroupInputSchema.safeParse({
                    board_id: "board123",
                    group_name: "New Group",
                    position_relative_method: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listGroupsInputSchema", () => {
            it("validates with board_id", () => {
                const result = listGroupsInputSchema.safeParse({
                    board_id: "board123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing board_id", () => {
                const result = listGroupsInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createColumnInputSchema", () => {
            it("validates minimal input", () => {
                const result = createColumnInputSchema.safeParse({
                    board_id: "board123",
                    title: "Status",
                    column_type: "status"
                });
                expect(result.success).toBe(true);
            });

            it("validates all column types", () => {
                const validTypes = [
                    "auto_number",
                    "checkbox",
                    "color_picker",
                    "country",
                    "date",
                    "dependency",
                    "dropdown",
                    "email",
                    "file",
                    "hour",
                    "link",
                    "location",
                    "long_text",
                    "mirror",
                    "numbers",
                    "people",
                    "phone",
                    "rating",
                    "status",
                    "tags",
                    "text",
                    "timeline",
                    "time_tracking",
                    "vote",
                    "week",
                    "world_clock"
                ];

                for (const columnType of validTypes) {
                    const result = createColumnInputSchema.safeParse({
                        board_id: "board123",
                        title: "Test",
                        column_type: columnType
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects invalid column_type", () => {
                const result = createColumnInputSchema.safeParse({
                    board_id: "board123",
                    title: "Test",
                    column_type: "invalid_type"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCurrentUserInputSchema", () => {
            it("validates empty input", () => {
                const result = getCurrentUserInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("listUsersInputSchema", () => {
            it("validates empty input (defaults applied)", () => {
                const result = listUsersInputSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.limit).toBe(50);
                }
            });

            it("validates full input", () => {
                const result = listUsersInputSchema.safeParse({
                    kind: "non_guests",
                    limit: 25,
                    page: 2
                });
                expect(result.success).toBe(true);
            });

            it("validates all user kinds", () => {
                const validKinds = ["all", "non_guests", "guests", "non_pending"];
                for (const kind of validKinds) {
                    const result = listUsersInputSchema.safeParse({ kind });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects invalid kind", () => {
                const result = listUsersInputSchema.safeParse({
                    kind: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listWorkspacesInputSchema", () => {
            it("validates empty input (defaults applied)", () => {
                const result = listWorkspacesInputSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.limit).toBe(50);
                }
            });

            it("validates full input", () => {
                const result = listWorkspacesInputSchema.safeParse({
                    limit: 25,
                    page: 3
                });
                expect(result.success).toBe(true);
            });

            it("rejects limit > 100", () => {
                const result = listWorkspacesInputSchema.safeParse({
                    limit: 200
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createUpdateInputSchema", () => {
            it("validates with required fields", () => {
                const result = createUpdateInputSchema.safeParse({
                    item_id: "item123",
                    body: "This is a comment"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing item_id", () => {
                const result = createUpdateInputSchema.safeParse({
                    body: "Comment"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty body", () => {
                const result = createUpdateInputSchema.safeParse({
                    item_id: "item123",
                    body: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listUpdatesInputSchema", () => {
            it("validates minimal input", () => {
                const result = listUpdatesInputSchema.safeParse({
                    item_id: "item123"
                });
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.limit).toBe(25);
                }
            });

            it("validates full input", () => {
                const result = listUpdatesInputSchema.safeParse({
                    item_id: "item123",
                    limit: 50,
                    page: 2
                });
                expect(result.success).toBe(true);
            });

            it("rejects limit > 100", () => {
                const result = listUpdatesInputSchema.safeParse({
                    item_id: "item123",
                    limit: 200
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
