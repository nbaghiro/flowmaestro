/**
 * Monday.com GraphQL Mutations
 */

// ============================================================================
// BOARD MUTATIONS
// ============================================================================

export const CREATE_BOARD = `
    mutation createBoard(
        $board_name: String!,
        $board_kind: BoardKind!,
        $description: String,
        $workspace_id: ID,
        $folder_id: ID,
        $template_id: ID
    ) {
        create_board(
            board_name: $board_name,
            board_kind: $board_kind,
            description: $description,
            workspace_id: $workspace_id,
            folder_id: $folder_id,
            template_id: $template_id
        ) {
            id
            name
            description
            state
            board_kind
            workspace_id
        }
    }
`;

export const UPDATE_BOARD = `
    mutation updateBoard(
        $board_id: ID!,
        $board_attribute: BoardAttributes!,
        $new_value: String!
    ) {
        update_board(
            board_id: $board_id,
            board_attribute: $board_attribute,
            new_value: $new_value
        )
    }
`;

export const DELETE_BOARD = `
    mutation deleteBoard($board_id: ID!) {
        delete_board(board_id: $board_id) {
            id
        }
    }
`;

export const ARCHIVE_BOARD = `
    mutation archiveBoard($board_id: ID!) {
        archive_board(board_id: $board_id) {
            id
            state
        }
    }
`;

export const DUPLICATE_BOARD = `
    mutation duplicateBoard(
        $board_id: ID!,
        $duplicate_type: DuplicateBoardType!,
        $board_name: String,
        $workspace_id: ID,
        $folder_id: ID,
        $keep_subscribers: Boolean
    ) {
        duplicate_board(
            board_id: $board_id,
            duplicate_type: $duplicate_type,
            board_name: $board_name,
            workspace_id: $workspace_id,
            folder_id: $folder_id,
            keep_subscribers: $keep_subscribers
        ) {
            board {
                id
                name
                state
                workspace_id
            }
        }
    }
`;

// ============================================================================
// ITEM MUTATIONS
// ============================================================================

export const CREATE_ITEM = `
    mutation createItem(
        $board_id: ID!,
        $item_name: String!,
        $group_id: String,
        $column_values: JSON
    ) {
        create_item(
            board_id: $board_id,
            item_name: $item_name,
            group_id: $group_id,
            column_values: $column_values
        ) {
            id
            name
            state
            board {
                id
                name
            }
            group {
                id
                title
            }
        }
    }
`;

export const UPDATE_ITEM = `
    mutation updateItem(
        $board_id: ID!,
        $item_id: ID!,
        $column_values: JSON!
    ) {
        change_multiple_column_values(
            board_id: $board_id,
            item_id: $item_id,
            column_values: $column_values
        ) {
            id
            name
            column_values {
                id
                type
                text
                value
            }
        }
    }
`;

export const DELETE_ITEM = `
    mutation deleteItem($item_id: ID!) {
        delete_item(item_id: $item_id) {
            id
        }
    }
`;

export const ARCHIVE_ITEM = `
    mutation archiveItem($item_id: ID!) {
        archive_item(item_id: $item_id) {
            id
            state
        }
    }
`;

export const DUPLICATE_ITEM = `
    mutation duplicateItem(
        $board_id: ID!,
        $item_id: ID!,
        $with_updates: Boolean
    ) {
        duplicate_item(
            board_id: $board_id,
            item_id: $item_id,
            with_updates: $with_updates
        ) {
            id
            name
            state
        }
    }
`;

export const MOVE_ITEM_TO_GROUP = `
    mutation moveItemToGroup($item_id: ID!, $group_id: String!) {
        move_item_to_group(item_id: $item_id, group_id: $group_id) {
            id
            name
            group {
                id
                title
            }
        }
    }
`;

export const MOVE_ITEM_TO_BOARD = `
    mutation moveItemToBoard(
        $item_id: ID!,
        $board_id: ID!,
        $group_id: ID!
    ) {
        move_item_to_board(
            item_id: $item_id,
            board_id: $board_id,
            group_id: $group_id
        ) {
            id
            name
            board {
                id
                name
            }
            group {
                id
                title
            }
        }
    }
`;

// ============================================================================
// GROUP MUTATIONS
// ============================================================================

export const CREATE_GROUP = `
    mutation createGroup(
        $board_id: ID!,
        $group_name: String!,
        $group_color: String,
        $position: String,
        $position_relative_method: PositionRelative
    ) {
        create_group(
            board_id: $board_id,
            group_name: $group_name,
            group_color: $group_color,
            position: $position,
            position_relative_method: $position_relative_method
        ) {
            id
            title
            color
            position
        }
    }
`;

export const UPDATE_GROUP = `
    mutation updateGroup(
        $board_id: ID!,
        $group_id: String!,
        $group_attribute: GroupAttributes!,
        $new_value: String!
    ) {
        update_group(
            board_id: $board_id,
            group_id: $group_id,
            group_attribute: $group_attribute,
            new_value: $new_value
        )
    }
`;

export const DELETE_GROUP = `
    mutation deleteGroup($board_id: ID!, $group_id: String!) {
        delete_group(board_id: $board_id, group_id: $group_id) {
            id
            deleted
        }
    }
`;

export const ARCHIVE_GROUP = `
    mutation archiveGroup($board_id: ID!, $group_id: String!) {
        archive_group(board_id: $board_id, group_id: $group_id) {
            id
            archived
        }
    }
`;

export const DUPLICATE_GROUP = `
    mutation duplicateGroup(
        $board_id: ID!,
        $group_id: String!,
        $add_to_top: Boolean,
        $group_title: String
    ) {
        duplicate_group(
            board_id: $board_id,
            group_id: $group_id,
            add_to_top: $add_to_top,
            group_title: $group_title
        ) {
            id
            title
            color
            position
        }
    }
`;

// ============================================================================
// COLUMN MUTATIONS
// ============================================================================

export const CREATE_COLUMN = `
    mutation createColumn(
        $board_id: ID!,
        $title: String!,
        $column_type: ColumnType!,
        $description: String,
        $defaults: JSON
    ) {
        create_column(
            board_id: $board_id,
            title: $title,
            column_type: $column_type,
            description: $description,
            defaults: $defaults
        ) {
            id
            title
            type
            description
            settings_str
        }
    }
`;

export const UPDATE_COLUMN = `
    mutation updateColumn(
        $board_id: ID!,
        $column_id: String!,
        $title: String,
        $description: String
    ) {
        change_column_metadata(
            board_id: $board_id,
            column_id: $column_id,
            column_property: title,
            value: $title
        ) {
            id
            title
            description
        }
    }
`;

export const DELETE_COLUMN = `
    mutation deleteColumn($board_id: ID!, $column_id: String!) {
        delete_column(board_id: $board_id, column_id: $column_id) {
            id
        }
    }
`;

export const CHANGE_COLUMN_VALUE = `
    mutation changeColumnValue(
        $board_id: ID!,
        $item_id: ID!,
        $column_id: String!,
        $value: JSON!
    ) {
        change_column_value(
            board_id: $board_id,
            item_id: $item_id,
            column_id: $column_id,
            value: $value
        ) {
            id
            name
        }
    }
`;

export const CHANGE_SIMPLE_COLUMN_VALUE = `
    mutation changeSimpleColumnValue(
        $board_id: ID!,
        $item_id: ID!,
        $column_id: String!,
        $value: String!
    ) {
        change_simple_column_value(
            board_id: $board_id,
            item_id: $item_id,
            column_id: $column_id,
            value: $value
        ) {
            id
            name
        }
    }
`;

// ============================================================================
// UPDATE MUTATIONS
// ============================================================================

export const CREATE_UPDATE = `
    mutation createUpdate($item_id: ID!, $body: String!) {
        create_update(item_id: $item_id, body: $body) {
            id
            body
            text_body
            created_at
            creator {
                id
                name
            }
        }
    }
`;

export const DELETE_UPDATE = `
    mutation deleteUpdate($update_id: ID!) {
        delete_update(id: $update_id) {
            id
        }
    }
`;
