/**
 * Auth0 Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeAssignRoles, assignRolesSchema } from "../operations/assignRoles";
import { executeCreateUser, createUserSchema } from "../operations/createUser";
import { executeDeleteUser, deleteUserSchema } from "../operations/deleteUser";
import { executeGetUser, getUserSchema } from "../operations/getUser";
import { executeGetUserRoles, getUserRolesSchema } from "../operations/getUserRoles";
import { executeListConnections, listConnectionsSchema } from "../operations/listConnections";
import { executeListRoles, listRolesSchema } from "../operations/listRoles";
import { executeListUsers, listUsersSchema } from "../operations/listUsers";
import { executeUpdateUser, updateUserSchema } from "../operations/updateUser";
import type { Auth0Client, Auth0User, Auth0Role, Auth0Connection } from "../client/Auth0Client";

// Type helpers for operation results
interface ListUsersResult {
    users: Array<{
        userId: string;
        email?: string;
        emailVerified?: boolean;
        name?: string;
        nickname?: string;
        picture?: string;
        createdAt: string;
        updatedAt: string;
        blocked?: boolean;
    }>;
    total?: number;
    page: number;
    perPage: number;
}

interface ListRolesResult {
    roles: Array<{
        id: string;
        name: string;
        description?: string;
    }>;
    total?: number;
    page: number;
    perPage: number;
}

interface GetUserRolesResult {
    userId: string;
    roles: Array<{
        id: string;
        name: string;
        description?: string;
    }>;
}

interface AssignRolesResult {
    userId: string;
    assignedRoleIds: string[];
}

interface ListConnectionsResult {
    connections: Array<{
        id: string;
        name: string;
        strategy: string;
        enabledClients?: string[];
    }>;
    total?: number;
    page: number;
    perPage: number;
}

interface UpdateUserResult {
    userId: string;
    email?: string;
    emailVerified?: boolean;
    name?: string;
    nickname?: string;
    picture?: string;
    blocked?: boolean;
    updatedAt: string;
}

// Mock Auth0Client factory
function createMockAuth0Client(): jest.Mocked<Auth0Client> {
    return {
        getUser: jest.fn(),
        listUsers: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        listRoles: jest.fn(),
        getUserRoles: jest.fn(),
        assignRoles: jest.fn(),
        removeRoles: jest.fn(),
        listConnections: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<Auth0Client>;
}

// Test fixtures
const mockUser: Auth0User = {
    user_id: "auth0|123456789",
    email: "test@example.com",
    email_verified: true,
    name: "Test User",
    nickname: "testuser",
    picture: "https://example.com/avatar.png",
    created_at: "2024-01-15T10:00:00.000Z",
    updated_at: "2024-01-20T15:30:00.000Z",
    blocked: false,
    app_metadata: { role: "admin" },
    user_metadata: { preferred_language: "en" }
};

const mockRole: Auth0Role = {
    id: "rol_123456789",
    name: "Admin",
    description: "Administrator role with full access"
};

const mockConnection: Auth0Connection = {
    id: "con_123456789",
    name: "Username-Password-Authentication",
    strategy: "auth0",
    enabled_clients: ["client1", "client2"]
};

describe("Auth0 Operation Executors", () => {
    let mockClient: jest.Mocked<Auth0Client>;

    beforeEach(() => {
        mockClient = createMockAuth0Client();
    });

    // ============================================================================
    // GET USER TESTS
    // ============================================================================

    describe("executeGetUser", () => {
        it("calls client with correct userId", async () => {
            mockClient.getUser.mockResolvedValueOnce(mockUser);

            await executeGetUser(mockClient, {
                userId: "auth0|123456789"
            });

            expect(mockClient.getUser).toHaveBeenCalledWith("auth0|123456789");
        });

        it("returns normalized output on success", async () => {
            mockClient.getUser.mockResolvedValueOnce(mockUser);

            const result = await executeGetUser(mockClient, {
                userId: "auth0|123456789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                userId: "auth0|123456789",
                email: "test@example.com",
                emailVerified: true,
                name: "Test User",
                nickname: "testuser",
                picture: "https://example.com/avatar.png",
                createdAt: "2024-01-15T10:00:00.000Z",
                updatedAt: "2024-01-20T15:30:00.000Z",
                blocked: false,
                appMetadata: { role: "admin" },
                userMetadata: { preferred_language: "en" }
            });
        });

        it("returns error when user not found", async () => {
            mockClient.getUser.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeGetUser(mockClient, {
                userId: "auth0|nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getUser.mockRejectedValueOnce("string error");

            const result = await executeGetUser(mockClient, {
                userId: "auth0|123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get user");
        });
    });

    // ============================================================================
    // LIST USERS TESTS
    // ============================================================================

    describe("executeListUsers", () => {
        it("calls client with default params", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                users: [],
                total: 0
            });

            // When called with empty object, params are passed as undefined
            // Zod defaults are only applied when schema.parse() is used
            await executeListUsers(mockClient, {});

            expect(mockClient.listUsers).toHaveBeenCalledWith({
                page: undefined,
                per_page: undefined,
                include_totals: undefined,
                q: undefined,
                search_engine: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                users: [],
                total: 0
            });

            await executeListUsers(mockClient, {
                page: 2,
                perPage: 25,
                query: "email:*@example.com",
                includeTotals: false
            });

            expect(mockClient.listUsers).toHaveBeenCalledWith({
                page: 2,
                per_page: 25,
                include_totals: false,
                q: "email:*@example.com",
                search_engine: "v3"
            });
        });

        it("returns normalized user list output", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                users: [mockUser],
                total: 1
            });

            const result = await executeListUsers(mockClient, {});
            const data = result.data as ListUsersResult;

            expect(result.success).toBe(true);
            expect(data.users).toHaveLength(1);
            expect(data.users[0]).toEqual({
                userId: "auth0|123456789",
                email: "test@example.com",
                emailVerified: true,
                name: "Test User",
                nickname: "testuser",
                picture: "https://example.com/avatar.png",
                createdAt: "2024-01-15T10:00:00.000Z",
                updatedAt: "2024-01-20T15:30:00.000Z",
                blocked: false
            });
            expect(data.total).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.listUsers.mockRejectedValueOnce(new Error("Insufficient permissions"));

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Insufficient permissions");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles empty results", async () => {
            mockClient.listUsers.mockResolvedValueOnce({
                users: [],
                total: 0
            });

            const result = await executeListUsers(mockClient, {});
            const data = result.data as ListUsersResult;

            expect(result.success).toBe(true);
            expect(data.users).toHaveLength(0);
            expect(data.total).toBe(0);
        });
    });

    // ============================================================================
    // CREATE USER TESTS
    // ============================================================================

    describe("executeCreateUser", () => {
        it("calls client with required params", async () => {
            mockClient.createUser.mockResolvedValueOnce(mockUser);

            await executeCreateUser(mockClient, {
                email: "test@example.com",
                connection: "Username-Password-Authentication",
                password: "SecurePass123!"
            });

            expect(mockClient.createUser).toHaveBeenCalledWith({
                email: "test@example.com",
                connection: "Username-Password-Authentication",
                password: "SecurePass123!",
                email_verified: undefined,
                name: undefined,
                nickname: undefined,
                picture: undefined,
                app_metadata: undefined,
                user_metadata: undefined
            });
        });

        it("calls client with all params", async () => {
            mockClient.createUser.mockResolvedValueOnce(mockUser);

            await executeCreateUser(mockClient, {
                email: "test@example.com",
                connection: "Username-Password-Authentication",
                password: "SecurePass123!",
                emailVerified: true,
                name: "Test User",
                nickname: "testuser",
                picture: "https://example.com/avatar.png",
                appMetadata: { role: "admin" },
                userMetadata: { language: "en" }
            });

            expect(mockClient.createUser).toHaveBeenCalledWith({
                email: "test@example.com",
                connection: "Username-Password-Authentication",
                password: "SecurePass123!",
                email_verified: true,
                name: "Test User",
                nickname: "testuser",
                picture: "https://example.com/avatar.png",
                app_metadata: { role: "admin" },
                user_metadata: { language: "en" }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.createUser.mockResolvedValueOnce(mockUser);

            const result = await executeCreateUser(mockClient, {
                email: "test@example.com",
                connection: "Username-Password-Authentication"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                userId: "auth0|123456789",
                email: "test@example.com",
                emailVerified: true,
                name: "Test User",
                nickname: "testuser",
                picture: "https://example.com/avatar.png",
                createdAt: "2024-01-15T10:00:00.000Z",
                updatedAt: "2024-01-20T15:30:00.000Z"
            });
        });

        it("returns error on duplicate email", async () => {
            mockClient.createUser.mockRejectedValueOnce(new Error("The user already exists."));

            const result = await executeCreateUser(mockClient, {
                email: "existing@example.com",
                connection: "Username-Password-Authentication"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("The user already exists.");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on invalid connection", async () => {
            mockClient.createUser.mockRejectedValueOnce(new Error("Connection not found."));

            const result = await executeCreateUser(mockClient, {
                email: "test@example.com",
                connection: "NonexistentConnection"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Connection not found.");
        });
    });

    // ============================================================================
    // UPDATE USER TESTS
    // ============================================================================

    describe("executeUpdateUser", () => {
        it("calls client with only userId when no updates provided", async () => {
            mockClient.updateUser.mockResolvedValueOnce(mockUser);

            await executeUpdateUser(mockClient, {
                userId: "auth0|123456789"
            });

            expect(mockClient.updateUser).toHaveBeenCalledWith("auth0|123456789", {});
        });

        it("calls client with all update fields", async () => {
            const updatedUser = { ...mockUser, name: "Updated Name" };
            mockClient.updateUser.mockResolvedValueOnce(updatedUser);

            await executeUpdateUser(mockClient, {
                userId: "auth0|123456789",
                email: "newemail@example.com",
                emailVerified: true,
                name: "Updated Name",
                nickname: "newnickname",
                picture: "https://example.com/new-avatar.png",
                password: "NewPassword123!",
                blocked: true,
                appMetadata: { newRole: "superadmin" },
                userMetadata: { language: "es" }
            });

            expect(mockClient.updateUser).toHaveBeenCalledWith("auth0|123456789", {
                email: "newemail@example.com",
                email_verified: true,
                name: "Updated Name",
                nickname: "newnickname",
                picture: "https://example.com/new-avatar.png",
                password: "NewPassword123!",
                blocked: true,
                app_metadata: { newRole: "superadmin" },
                user_metadata: { language: "es" }
            });
        });

        it("returns normalized output on success", async () => {
            const updatedUser = { ...mockUser, name: "Updated Name" };
            mockClient.updateUser.mockResolvedValueOnce(updatedUser);

            const result = await executeUpdateUser(mockClient, {
                userId: "auth0|123456789",
                name: "Updated Name"
            });
            const data = result.data as UpdateUserResult;

            expect(result.success).toBe(true);
            expect(data.name).toBe("Updated Name");
        });

        it("returns error when user not found", async () => {
            mockClient.updateUser.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeUpdateUser(mockClient, {
                userId: "auth0|nonexistent",
                name: "New Name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles partial updates correctly", async () => {
            mockClient.updateUser.mockResolvedValueOnce(mockUser);

            await executeUpdateUser(mockClient, {
                userId: "auth0|123456789",
                blocked: true
            });

            expect(mockClient.updateUser).toHaveBeenCalledWith("auth0|123456789", {
                blocked: true
            });
        });
    });

    // ============================================================================
    // DELETE USER TESTS
    // ============================================================================

    describe("executeDeleteUser", () => {
        it("calls client with correct userId", async () => {
            mockClient.deleteUser.mockResolvedValueOnce(undefined);

            await executeDeleteUser(mockClient, {
                userId: "auth0|123456789"
            });

            expect(mockClient.deleteUser).toHaveBeenCalledWith("auth0|123456789");
        });

        it("returns success with deleted flag", async () => {
            mockClient.deleteUser.mockResolvedValueOnce(undefined);

            const result = await executeDeleteUser(mockClient, {
                userId: "auth0|123456789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                userId: "auth0|123456789"
            });
        });

        it("returns error when user not found", async () => {
            mockClient.deleteUser.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeDeleteUser(mockClient, {
                userId: "auth0|nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on permission denied", async () => {
            mockClient.deleteUser.mockRejectedValueOnce(
                new Error("Insufficient permissions to perform this action.")
            );

            const result = await executeDeleteUser(mockClient, {
                userId: "auth0|123456789"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Insufficient permissions to perform this action.");
        });
    });

    // ============================================================================
    // LIST ROLES TESTS
    // ============================================================================

    describe("executeListRoles", () => {
        it("calls client with default params", async () => {
            mockClient.listRoles.mockResolvedValueOnce({
                roles: [],
                total: 0
            });

            // When called with empty object, params are passed as undefined
            await executeListRoles(mockClient, {});

            expect(mockClient.listRoles).toHaveBeenCalledWith({
                page: undefined,
                per_page: undefined,
                include_totals: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listRoles.mockResolvedValueOnce({
                roles: [],
                total: 0
            });

            await executeListRoles(mockClient, {
                page: 1,
                perPage: 25,
                includeTotals: false
            });

            expect(mockClient.listRoles).toHaveBeenCalledWith({
                page: 1,
                per_page: 25,
                include_totals: false
            });
        });

        it("returns normalized role list output", async () => {
            mockClient.listRoles.mockResolvedValueOnce({
                roles: [mockRole],
                total: 1
            });

            const result = await executeListRoles(mockClient, {});
            const data = result.data as ListRolesResult;

            expect(result.success).toBe(true);
            expect(data.roles).toHaveLength(1);
            expect(data.roles[0]).toEqual({
                id: "rol_123456789",
                name: "Admin",
                description: "Administrator role with full access"
            });
            expect(data.total).toBe(1);
        });

        it("handles roles without description", async () => {
            const roleWithoutDesc: Auth0Role = {
                id: "rol_987654321",
                name: "BasicUser"
            };
            mockClient.listRoles.mockResolvedValueOnce({
                roles: [roleWithoutDesc],
                total: 1
            });

            const result = await executeListRoles(mockClient, {});
            const data = result.data as ListRolesResult;

            expect(result.success).toBe(true);
            expect(data.roles[0].description).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listRoles.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListRoles(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Rate limited");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================================================
    // GET USER ROLES TESTS
    // ============================================================================

    describe("executeGetUserRoles", () => {
        it("calls client with correct userId", async () => {
            mockClient.getUserRoles.mockResolvedValueOnce([mockRole]);

            await executeGetUserRoles(mockClient, {
                userId: "auth0|123456789"
            });

            expect(mockClient.getUserRoles).toHaveBeenCalledWith("auth0|123456789");
        });

        it("returns normalized output with user roles", async () => {
            mockClient.getUserRoles.mockResolvedValueOnce([mockRole]);

            const result = await executeGetUserRoles(mockClient, {
                userId: "auth0|123456789"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                userId: "auth0|123456789",
                roles: [
                    {
                        id: "rol_123456789",
                        name: "Admin",
                        description: "Administrator role with full access"
                    }
                ]
            });
        });

        it("returns empty roles array when user has no roles", async () => {
            mockClient.getUserRoles.mockResolvedValueOnce([]);

            const result = await executeGetUserRoles(mockClient, {
                userId: "auth0|123456789"
            });
            const data = result.data as GetUserRolesResult;

            expect(result.success).toBe(true);
            expect(data.roles).toHaveLength(0);
        });

        it("returns error when user not found", async () => {
            mockClient.getUserRoles.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeGetUserRoles(mockClient, {
                userId: "auth0|nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
        });
    });

    // ============================================================================
    // ASSIGN ROLES TESTS
    // ============================================================================

    describe("executeAssignRoles", () => {
        it("calls client with userId and roleIds", async () => {
            mockClient.assignRoles.mockResolvedValueOnce(undefined);

            await executeAssignRoles(mockClient, {
                userId: "auth0|123456789",
                roleIds: ["rol_123", "rol_456"]
            });

            expect(mockClient.assignRoles).toHaveBeenCalledWith("auth0|123456789", [
                "rol_123",
                "rol_456"
            ]);
        });

        it("returns success with assigned role IDs", async () => {
            mockClient.assignRoles.mockResolvedValueOnce(undefined);

            const result = await executeAssignRoles(mockClient, {
                userId: "auth0|123456789",
                roleIds: ["rol_123"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                userId: "auth0|123456789",
                assignedRoleIds: ["rol_123"]
            });
        });

        it("handles multiple role assignments", async () => {
            mockClient.assignRoles.mockResolvedValueOnce(undefined);

            const result = await executeAssignRoles(mockClient, {
                userId: "auth0|123456789",
                roleIds: ["rol_1", "rol_2", "rol_3"]
            });
            const data = result.data as AssignRolesResult;

            expect(result.success).toBe(true);
            expect(data.assignedRoleIds).toHaveLength(3);
        });

        it("returns error when role not found", async () => {
            mockClient.assignRoles.mockRejectedValueOnce(new Error("Role not found."));

            const result = await executeAssignRoles(mockClient, {
                userId: "auth0|123456789",
                roleIds: ["rol_nonexistent"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Role not found.");
            expect(result.error?.retryable).toBe(true);
        });

        it("returns error when user not found", async () => {
            mockClient.assignRoles.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeAssignRoles(mockClient, {
                userId: "auth0|nonexistent",
                roleIds: ["rol_123"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
        });
    });

    // ============================================================================
    // LIST CONNECTIONS TESTS
    // ============================================================================

    describe("executeListConnections", () => {
        it("calls client with default params", async () => {
            mockClient.listConnections.mockResolvedValueOnce({
                connections: [],
                total: 0
            });

            // When called with empty object, params are passed as undefined
            await executeListConnections(mockClient, {});

            expect(mockClient.listConnections).toHaveBeenCalledWith({
                page: undefined,
                per_page: undefined,
                include_totals: undefined,
                strategy: undefined
            });
        });

        it("calls client with strategy filter", async () => {
            mockClient.listConnections.mockResolvedValueOnce({
                connections: [],
                total: 0
            });

            await executeListConnections(mockClient, {
                strategy: "google-oauth2"
            });

            expect(mockClient.listConnections).toHaveBeenCalledWith({
                page: undefined,
                per_page: undefined,
                include_totals: undefined,
                strategy: "google-oauth2"
            });
        });

        it("returns normalized connection list output", async () => {
            mockClient.listConnections.mockResolvedValueOnce({
                connections: [mockConnection],
                total: 1
            });

            const result = await executeListConnections(mockClient, {});
            const data = result.data as ListConnectionsResult;

            expect(result.success).toBe(true);
            expect(data.connections).toHaveLength(1);
            expect(data.connections[0]).toEqual({
                id: "con_123456789",
                name: "Username-Password-Authentication",
                strategy: "auth0",
                enabledClients: ["client1", "client2"]
            });
            expect(data.total).toBe(1);
        });

        it("handles connections without enabled_clients", async () => {
            const connectionWithoutClients: Auth0Connection = {
                id: "con_987654321",
                name: "Social-Connection",
                strategy: "google-oauth2"
            };
            mockClient.listConnections.mockResolvedValueOnce({
                connections: [connectionWithoutClients],
                total: 1
            });

            const result = await executeListConnections(mockClient, {});
            const data = result.data as ListConnectionsResult;

            expect(result.success).toBe(true);
            expect(data.connections[0].enabledClients).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listConnections.mockRejectedValueOnce(new Error("Insufficient permissions"));

            const result = await executeListConnections(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Insufficient permissions");
            expect(result.error?.retryable).toBe(true);
        });
    });

    // ============================================================================
    // SCHEMA VALIDATION TESTS
    // ============================================================================

    describe("schema validation", () => {
        describe("getUserSchema", () => {
            it("validates minimal input", () => {
                const result = getUserSchema.safeParse({
                    userId: "auth0|123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing userId", () => {
                const result = getUserSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty userId", () => {
                const result = getUserSchema.safeParse({
                    userId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listUsersSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listUsersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination params", () => {
                const result = listUsersSchema.safeParse({
                    page: 0,
                    perPage: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with query", () => {
                const result = listUsersSchema.safeParse({
                    query: "email:*@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("rejects perPage over 100", () => {
                const result = listUsersSchema.safeParse({
                    perPage: 101
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative page", () => {
                const result = listUsersSchema.safeParse({
                    page: -1
                });
                expect(result.success).toBe(false);
            });

            it("accepts all optional params", () => {
                const result = listUsersSchema.parse({});
                expect(result.perPage).toBeUndefined();
                expect(result.includeTotals).toBeUndefined();
            });
        });

        describe("createUserSchema", () => {
            it("validates minimal input", () => {
                const result = createUserSchema.safeParse({
                    email: "test@example.com",
                    connection: "Username-Password-Authentication"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createUserSchema.safeParse({
                    email: "test@example.com",
                    connection: "Username-Password-Authentication",
                    password: "SecurePass123!",
                    emailVerified: true,
                    name: "Test User",
                    nickname: "testuser",
                    picture: "https://example.com/avatar.png",
                    appMetadata: { role: "admin" },
                    userMetadata: { language: "en" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = createUserSchema.safeParse({
                    email: "invalid-email",
                    connection: "Username-Password-Authentication"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing connection", () => {
                const result = createUserSchema.safeParse({
                    email: "test@example.com"
                });
                expect(result.success).toBe(false);
            });

            it("rejects short password", () => {
                const result = createUserSchema.safeParse({
                    email: "test@example.com",
                    connection: "Username-Password-Authentication",
                    password: "short"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid picture URL", () => {
                const result = createUserSchema.safeParse({
                    email: "test@example.com",
                    connection: "Username-Password-Authentication",
                    picture: "not-a-url"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateUserSchema", () => {
            it("validates minimal input", () => {
                const result = updateUserSchema.safeParse({
                    userId: "auth0|123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all optional fields", () => {
                const result = updateUserSchema.safeParse({
                    userId: "auth0|123",
                    email: "new@example.com",
                    blocked: true,
                    name: "New Name"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid email", () => {
                const result = updateUserSchema.safeParse({
                    userId: "auth0|123",
                    email: "invalid"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteUserSchema", () => {
            it("validates minimal input", () => {
                const result = deleteUserSchema.safeParse({
                    userId: "auth0|123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty userId", () => {
                const result = deleteUserSchema.safeParse({
                    userId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listRolesSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listRolesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listRolesSchema.safeParse({
                    page: 0,
                    perPage: 25
                });
                expect(result.success).toBe(true);
            });

            it("accepts all optional params", () => {
                const result = listRolesSchema.parse({});
                expect(result.perPage).toBeUndefined();
                expect(result.includeTotals).toBeUndefined();
            });
        });

        describe("getUserRolesSchema", () => {
            it("validates minimal input", () => {
                const result = getUserRolesSchema.safeParse({
                    userId: "auth0|123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing userId", () => {
                const result = getUserRolesSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("assignRolesSchema", () => {
            it("validates minimal input", () => {
                const result = assignRolesSchema.safeParse({
                    userId: "auth0|123",
                    roleIds: ["rol_123"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with multiple roles", () => {
                const result = assignRolesSchema.safeParse({
                    userId: "auth0|123",
                    roleIds: ["rol_1", "rol_2", "rol_3"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty roleIds array", () => {
                const result = assignRolesSchema.safeParse({
                    userId: "auth0|123",
                    roleIds: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing roleIds", () => {
                const result = assignRolesSchema.safeParse({
                    userId: "auth0|123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listConnectionsSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listConnectionsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with strategy filter", () => {
                const result = listConnectionsSchema.safeParse({
                    strategy: "google-oauth2"
                });
                expect(result.success).toBe(true);
            });

            it("validates with all params", () => {
                const result = listConnectionsSchema.safeParse({
                    page: 0,
                    perPage: 25,
                    strategy: "auth0",
                    includeTotals: false
                });
                expect(result.success).toBe(true);
            });

            it("accepts all optional params", () => {
                const result = listConnectionsSchema.parse({});
                expect(result.perPage).toBeUndefined();
                expect(result.includeTotals).toBeUndefined();
            });
        });
    });
});
