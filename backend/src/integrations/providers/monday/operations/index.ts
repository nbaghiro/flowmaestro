/**
 * Monday.com Operations Index
 * All operations are exported from this file
 */

// Board Operations
export {
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
    executeDuplicateBoard
} from "./boards";

// Item Operations
export {
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
    executeMoveItemToBoard
} from "./items";

// Group Operations
export {
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
    executeDuplicateGroup
} from "./groups";

// Column Operations
export {
    createColumnOperation,
    executeCreateColumn,
    deleteColumnOperation,
    executeDeleteColumn,
    listColumnsOperation,
    executeListColumns,
    changeColumnValueOperation,
    executeChangeColumnValue,
    changeSimpleColumnValueOperation,
    executeChangeSimpleColumnValue
} from "./columns";

// User Operations
export {
    getCurrentUserOperation,
    executeGetCurrentUser,
    getUserOperation,
    executeGetUser,
    listUsersOperation,
    executeListUsers
} from "./users";

// Workspace Operations
export {
    listWorkspacesOperation,
    executeListWorkspaces,
    getWorkspaceOperation,
    executeGetWorkspace
} from "./workspaces";

// Team Operations
export { listTeamsOperation, executeListTeams } from "./teams";

// Tag Operations
export { listTagsOperation, executeListTags } from "./tags";

// Update Operations
export {
    createUpdateOperation,
    executeCreateUpdate,
    listUpdatesOperation,
    executeListUpdates,
    deleteUpdateOperation,
    executeDeleteUpdate
} from "./updates";
