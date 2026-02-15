/**
 * Auth0 Operations Index
 */

// User operations
export { executeGetUser, getUserSchema, getUserOperation, type GetUserParams } from "./getUser";
export {
    executeListUsers,
    listUsersSchema,
    listUsersOperation,
    type ListUsersParams
} from "./listUsers";
export {
    executeCreateUser,
    createUserSchema,
    createUserOperation,
    type CreateUserParams
} from "./createUser";
export {
    executeUpdateUser,
    updateUserSchema,
    updateUserOperation,
    type UpdateUserParams
} from "./updateUser";
export {
    executeDeleteUser,
    deleteUserSchema,
    deleteUserOperation,
    type DeleteUserParams
} from "./deleteUser";

// Role operations
export {
    executeListRoles,
    listRolesSchema,
    listRolesOperation,
    type ListRolesParams
} from "./listRoles";
export {
    executeGetUserRoles,
    getUserRolesSchema,
    getUserRolesOperation,
    type GetUserRolesParams
} from "./getUserRoles";
export {
    executeAssignRoles,
    assignRolesSchema,
    assignRolesOperation,
    type AssignRolesParams
} from "./assignRoles";

// Connection operations
export {
    executeListConnections,
    listConnectionsSchema,
    listConnectionsOperation,
    type ListConnectionsParams
} from "./listConnections";

// Types
export * from "./types";
