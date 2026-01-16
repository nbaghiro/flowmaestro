/**
 * Monday.com GraphQL Queries
 */

// ============================================================================
// BOARD QUERIES
// ============================================================================

export const GET_BOARD = `
    query getBoard($board_id: ID!) {
        boards(ids: [$board_id]) {
            id
            name
            description
            state
            board_kind
            board_folder_id
            workspace_id
            permissions
            columns {
                id
                title
                type
                settings_str
            }
            groups {
                id
                title
                color
                position
            }
            owners {
                id
                name
                email
            }
        }
    }
`;

export const LIST_BOARDS = `
    query listBoards(
        $workspace_ids: [ID],
        $board_kind: BoardKind,
        $state: State,
        $limit: Int,
        $page: Int
    ) {
        boards(
            workspace_ids: $workspace_ids,
            board_kind: $board_kind,
            state: $state,
            limit: $limit,
            page: $page
        ) {
            id
            name
            description
            state
            board_kind
            board_folder_id
            workspace_id
            permissions
        }
    }
`;

// ============================================================================
// ITEM QUERIES
// ============================================================================

export const GET_ITEM = `
    query getItem($item_id: ID!) {
        items(ids: [$item_id]) {
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
            column_values {
                id
                type
                text
                value
            }
            creator {
                id
                name
                email
            }
            created_at
            updated_at
        }
    }
`;

export const LIST_ITEMS = `
    query listItems($board_id: ID!, $limit: Int, $cursor: String) {
        boards(ids: [$board_id]) {
            items_page(limit: $limit, cursor: $cursor) {
                cursor
                items {
                    id
                    name
                    state
                    group {
                        id
                        title
                    }
                    column_values {
                        id
                        type
                        text
                        value
                    }
                    created_at
                    updated_at
                }
            }
        }
    }
`;

export const LIST_ITEMS_IN_GROUP = `
    query listItemsInGroup($board_id: ID!, $group_id: String!, $limit: Int, $cursor: String) {
        boards(ids: [$board_id]) {
            groups(ids: [$group_id]) {
                items_page(limit: $limit, cursor: $cursor) {
                    cursor
                    items {
                        id
                        name
                        state
                        column_values {
                            id
                            type
                            text
                            value
                        }
                        created_at
                        updated_at
                    }
                }
            }
        }
    }
`;

// ============================================================================
// GROUP QUERIES
// ============================================================================

export const LIST_GROUPS = `
    query listGroups($board_id: ID!) {
        boards(ids: [$board_id]) {
            groups {
                id
                title
                color
                position
                archived
            }
        }
    }
`;

// ============================================================================
// COLUMN QUERIES
// ============================================================================

export const LIST_COLUMNS = `
    query listColumns($board_id: ID!) {
        boards(ids: [$board_id]) {
            columns {
                id
                title
                type
                description
                settings_str
                width
                archived
            }
        }
    }
`;

// ============================================================================
// UPDATE QUERIES
// ============================================================================

export const LIST_UPDATES = `
    query listUpdates($item_id: ID!, $limit: Int, $page: Int) {
        items(ids: [$item_id]) {
            updates(limit: $limit, page: $page) {
                id
                body
                text_body
                created_at
                updated_at
                creator {
                    id
                    name
                    email
                }
            }
        }
    }
`;

// ============================================================================
// USER QUERIES
// ============================================================================

export const GET_CURRENT_USER = `
    query getCurrentUser {
        me {
            id
            name
            email
            photo_thumb
            title
            account {
                id
                name
                slug
            }
            teams {
                id
                name
            }
        }
    }
`;

export const GET_USER = `
    query getUser($user_id: ID!) {
        users(ids: [$user_id]) {
            id
            name
            email
            photo_thumb
            title
            enabled
            created_at
        }
    }
`;

export const LIST_USERS = `
    query listUsers($kind: UserKind, $limit: Int, $page: Int) {
        users(kind: $kind, limit: $limit, page: $page) {
            id
            name
            email
            photo_thumb
            title
            enabled
            is_admin
            is_guest
            created_at
        }
    }
`;

// ============================================================================
// WORKSPACE QUERIES
// ============================================================================

export const LIST_WORKSPACES = `
    query listWorkspaces($limit: Int, $page: Int) {
        workspaces(limit: $limit, page: $page) {
            id
            name
            kind
            description
            state
        }
    }
`;

export const GET_WORKSPACE = `
    query getWorkspace($workspace_id: ID!) {
        workspaces(ids: [$workspace_id]) {
            id
            name
            kind
            description
            state
            owners_subscribers {
                id
                name
                email
            }
        }
    }
`;

// ============================================================================
// TEAM QUERIES
// ============================================================================

export const LIST_TEAMS = `
    query listTeams {
        teams {
            id
            name
            picture_url
            users {
                id
                name
            }
        }
    }
`;

// ============================================================================
// TAG QUERIES
// ============================================================================

export const LIST_TAGS = `
    query listTags($board_id: ID!) {
        boards(ids: [$board_id]) {
            tags {
                id
                name
                color
            }
        }
    }
`;
