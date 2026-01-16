import { z } from "zod";

/**
 * Monday.com Integration - Zod Validation Schemas
 * All schemas for the Monday.com operations
 */

// ============================================================================
// BOARD OPERATIONS
// ============================================================================

/**
 * Create Board Schema
 */
export const createBoardInputSchema = z.object({
    board_name: z.string().min(1).max(255).describe("Name of the board"),
    board_kind: z.enum(["public", "private", "share"]).describe("Board visibility type"),
    description: z.string().optional().describe("Board description"),
    workspace_id: z.string().optional().describe("Workspace ID to create the board in"),
    folder_id: z.string().optional().describe("Folder ID to place the board in"),
    template_id: z.string().optional().describe("Template ID to base the board on")
});

export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;

/**
 * Get Board Schema
 */
export const getBoardInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to retrieve")
});

export type GetBoardInput = z.infer<typeof getBoardInputSchema>;

/**
 * Update Board Schema
 */
export const updateBoardInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to update"),
    board_attribute: z
        .enum(["name", "description", "communication"])
        .describe("The attribute to update"),
    new_value: z.string().describe("The new value for the attribute")
});

export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;

/**
 * Delete Board Schema
 */
export const deleteBoardInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to delete")
});

export type DeleteBoardInput = z.infer<typeof deleteBoardInputSchema>;

/**
 * List Boards Schema
 */
export const listBoardsInputSchema = z.object({
    workspace_ids: z.array(z.string()).optional().describe("Filter by workspace IDs"),
    board_kind: z.enum(["public", "private", "share"]).optional().describe("Filter by board type"),
    state: z
        .enum(["active", "archived", "deleted", "all"])
        .optional()
        .describe("Filter by board state"),
    limit: z.number().int().min(1).max(100).default(25).describe("Number of boards to return"),
    page: z.number().int().min(1).optional().describe("Page number for pagination")
});

export type ListBoardsInput = z.infer<typeof listBoardsInputSchema>;

/**
 * Archive Board Schema
 */
export const archiveBoardInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to archive")
});

export type ArchiveBoardInput = z.infer<typeof archiveBoardInputSchema>;

/**
 * Duplicate Board Schema
 */
export const duplicateBoardInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to duplicate"),
    duplicate_type: z
        .enum([
            "duplicate_board_with_structure",
            "duplicate_board_with_pulses",
            "duplicate_board_with_pulses_and_updates"
        ])
        .describe("Type of duplication"),
    board_name: z.string().optional().describe("Name for the duplicated board"),
    workspace_id: z.string().optional().describe("Workspace ID for the duplicated board"),
    folder_id: z.string().optional().describe("Folder ID for the duplicated board"),
    keep_subscribers: z.boolean().optional().describe("Whether to keep subscribers")
});

export type DuplicateBoardInput = z.infer<typeof duplicateBoardInputSchema>;

// ============================================================================
// ITEM OPERATIONS
// ============================================================================

/**
 * Create Item Schema
 */
export const createItemInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to create the item in"),
    item_name: z.string().min(1).max(255).describe("Name of the item"),
    group_id: z.string().optional().describe("The ID of the group to create the item in"),
    column_values: z
        .record(z.unknown())
        .optional()
        .describe("Column values as JSON object (column_id -> value)")
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

/**
 * Get Item Schema
 */
export const getItemInputSchema = z.object({
    item_id: z.string().describe("The ID of the item to retrieve")
});

export type GetItemInput = z.infer<typeof getItemInputSchema>;

/**
 * Update Item Schema
 */
export const updateItemInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the item"),
    item_id: z.string().describe("The ID of the item to update"),
    column_values: z.record(z.unknown()).describe("Column values to update as JSON object")
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

/**
 * Delete Item Schema
 */
export const deleteItemInputSchema = z.object({
    item_id: z.string().describe("The ID of the item to delete")
});

export type DeleteItemInput = z.infer<typeof deleteItemInputSchema>;

/**
 * List Items Schema
 */
export const listItemsInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to get items from"),
    group_id: z.string().optional().describe("Filter by group ID"),
    limit: z.number().int().min(1).max(500).default(100).describe("Number of items to return"),
    cursor: z.string().optional().describe("Cursor for pagination")
});

export type ListItemsInput = z.infer<typeof listItemsInputSchema>;

/**
 * Archive Item Schema
 */
export const archiveItemInputSchema = z.object({
    item_id: z.string().describe("The ID of the item to archive")
});

export type ArchiveItemInput = z.infer<typeof archiveItemInputSchema>;

/**
 * Duplicate Item Schema
 */
export const duplicateItemInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the item"),
    item_id: z.string().describe("The ID of the item to duplicate"),
    with_updates: z.boolean().optional().describe("Whether to duplicate updates/comments")
});

export type DuplicateItemInput = z.infer<typeof duplicateItemInputSchema>;

/**
 * Move Item to Group Schema
 */
export const moveItemToGroupInputSchema = z.object({
    item_id: z.string().describe("The ID of the item to move"),
    group_id: z.string().describe("The ID of the target group")
});

export type MoveItemToGroupInput = z.infer<typeof moveItemToGroupInputSchema>;

/**
 * Move Item to Board Schema
 */
export const moveItemToBoardInputSchema = z.object({
    item_id: z.string().describe("The ID of the item to move"),
    board_id: z.string().describe("The ID of the target board"),
    group_id: z.string().describe("The ID of the target group in the new board")
});

export type MoveItemToBoardInput = z.infer<typeof moveItemToBoardInputSchema>;

// ============================================================================
// GROUP OPERATIONS
// ============================================================================

/**
 * Create Group Schema
 */
export const createGroupInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to create the group in"),
    group_name: z.string().min(1).max(255).describe("Name of the group"),
    group_color: z.string().optional().describe("Color of the group (hex without #)"),
    position: z.string().optional().describe("Position relative to other groups"),
    position_relative_method: z
        .enum(["before_at", "after_at"])
        .optional()
        .describe("Position method")
});

export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

/**
 * Update Group Schema
 */
export const updateGroupInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the group"),
    group_id: z.string().describe("The ID of the group to update"),
    group_attribute: z.enum(["title", "color", "position"]).describe("The attribute to update"),
    new_value: z.string().describe("The new value for the attribute")
});

export type UpdateGroupInput = z.infer<typeof updateGroupInputSchema>;

/**
 * Delete Group Schema
 */
export const deleteGroupInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the group"),
    group_id: z.string().describe("The ID of the group to delete")
});

export type DeleteGroupInput = z.infer<typeof deleteGroupInputSchema>;

/**
 * List Groups Schema
 */
export const listGroupsInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to get groups from")
});

export type ListGroupsInput = z.infer<typeof listGroupsInputSchema>;

/**
 * Archive Group Schema
 */
export const archiveGroupInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the group"),
    group_id: z.string().describe("The ID of the group to archive")
});

export type ArchiveGroupInput = z.infer<typeof archiveGroupInputSchema>;

/**
 * Duplicate Group Schema
 */
export const duplicateGroupInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the group"),
    group_id: z.string().describe("The ID of the group to duplicate"),
    add_to_top: z.boolean().optional().describe("Whether to add the duplicated group at the top"),
    group_title: z.string().optional().describe("Title for the duplicated group")
});

export type DuplicateGroupInput = z.infer<typeof duplicateGroupInputSchema>;

// ============================================================================
// COLUMN OPERATIONS
// ============================================================================

/**
 * Create Column Schema
 */
export const createColumnInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to create the column in"),
    title: z.string().min(1).max(255).describe("Title of the column"),
    column_type: z
        .enum([
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
        ])
        .describe("Type of the column"),
    description: z.string().optional().describe("Description of the column"),
    defaults: z.record(z.unknown()).optional().describe("Default values for the column")
});

export type CreateColumnInput = z.infer<typeof createColumnInputSchema>;

/**
 * Update Column Schema
 */
export const updateColumnInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the column"),
    column_id: z.string().describe("The ID of the column to update"),
    title: z.string().optional().describe("New title for the column"),
    description: z.string().optional().describe("New description for the column")
});

export type UpdateColumnInput = z.infer<typeof updateColumnInputSchema>;

/**
 * Delete Column Schema
 */
export const deleteColumnInputSchema = z.object({
    board_id: z.string().describe("The ID of the board containing the column"),
    column_id: z.string().describe("The ID of the column to delete")
});

export type DeleteColumnInput = z.infer<typeof deleteColumnInputSchema>;

/**
 * List Columns Schema
 */
export const listColumnsInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to get columns from")
});

export type ListColumnsInput = z.infer<typeof listColumnsInputSchema>;

/**
 * Change Column Value Schema
 */
export const changeColumnValueInputSchema = z.object({
    board_id: z.string().describe("The ID of the board"),
    item_id: z.string().describe("The ID of the item"),
    column_id: z.string().describe("The ID of the column"),
    value: z.string().describe("The new value (as JSON string)")
});

export type ChangeColumnValueInput = z.infer<typeof changeColumnValueInputSchema>;

/**
 * Change Simple Column Value Schema
 */
export const changeSimpleColumnValueInputSchema = z.object({
    board_id: z.string().describe("The ID of the board"),
    item_id: z.string().describe("The ID of the item"),
    column_id: z.string().describe("The ID of the column"),
    value: z.string().describe("The new simple text value")
});

export type ChangeSimpleColumnValueInput = z.infer<typeof changeSimpleColumnValueInputSchema>;

// ============================================================================
// UPDATE (COMMENT) OPERATIONS
// ============================================================================

/**
 * Create Update Schema
 */
export const createUpdateInputSchema = z.object({
    item_id: z.string().describe("The ID of the item to add the update to"),
    body: z.string().min(1).describe("The text content of the update")
});

export type CreateUpdateInput = z.infer<typeof createUpdateInputSchema>;

/**
 * List Updates Schema
 */
export const listUpdatesInputSchema = z.object({
    item_id: z.string().describe("The ID of the item to get updates from"),
    limit: z.number().int().min(1).max(100).default(25).describe("Number of updates to return"),
    page: z.number().int().min(1).optional().describe("Page number for pagination")
});

export type ListUpdatesInput = z.infer<typeof listUpdatesInputSchema>;

/**
 * Delete Update Schema
 */
export const deleteUpdateInputSchema = z.object({
    update_id: z.string().describe("The ID of the update to delete")
});

export type DeleteUpdateInput = z.infer<typeof deleteUpdateInputSchema>;

// ============================================================================
// USER OPERATIONS
// ============================================================================

/**
 * Get Current User Schema
 */
export const getCurrentUserInputSchema = z.object({});

export type GetCurrentUserInput = z.infer<typeof getCurrentUserInputSchema>;

/**
 * List Users Schema
 */
export const listUsersInputSchema = z.object({
    kind: z
        .enum(["all", "non_guests", "guests", "non_pending"])
        .optional()
        .describe("Filter users by type"),
    limit: z.number().int().min(1).max(100).default(50).describe("Number of users to return"),
    page: z.number().int().min(1).optional().describe("Page number for pagination")
});

export type ListUsersInput = z.infer<typeof listUsersInputSchema>;

/**
 * Get User Schema
 */
export const getUserInputSchema = z.object({
    user_id: z.string().describe("The ID of the user to retrieve")
});

export type GetUserInput = z.infer<typeof getUserInputSchema>;

// ============================================================================
// WORKSPACE OPERATIONS
// ============================================================================

/**
 * List Workspaces Schema
 */
export const listWorkspacesInputSchema = z.object({
    limit: z.number().int().min(1).max(100).default(50).describe("Number of workspaces to return"),
    page: z.number().int().min(1).optional().describe("Page number for pagination")
});

export type ListWorkspacesInput = z.infer<typeof listWorkspacesInputSchema>;

/**
 * Get Workspace Schema
 */
export const getWorkspaceInputSchema = z.object({
    workspace_id: z.string().describe("The ID of the workspace to retrieve")
});

export type GetWorkspaceInput = z.infer<typeof getWorkspaceInputSchema>;

// ============================================================================
// TEAM OPERATIONS
// ============================================================================

/**
 * List Teams Schema
 */
export const listTeamsInputSchema = z.object({
    limit: z.number().int().min(1).max(100).default(50).describe("Number of teams to return"),
    page: z.number().int().min(1).optional().describe("Page number for pagination")
});

export type ListTeamsInput = z.infer<typeof listTeamsInputSchema>;

// ============================================================================
// TAG OPERATIONS
// ============================================================================

/**
 * List Tags Schema
 */
export const listTagsInputSchema = z.object({
    board_id: z.string().describe("The ID of the board to get tags from")
});

export type ListTagsInput = z.infer<typeof listTagsInputSchema>;

// ============================================================================
// CONNECTION METADATA
// ============================================================================

/**
 * Monday.com Connection Metadata
 * Stored in connection.metadata
 */
export interface MondayConnectionMetadata {
    accountId?: string;
    accountName?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
}
