/**
 * Okta Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeAddUserToGroup, addUserToGroupSchema } from "../operations/addUserToGroup";
import {
    executeAssignUserToApplication,
    assignUserToApplicationSchema
} from "../operations/assignUserToApplication";
import { executeCreateGroup, createGroupSchema } from "../operations/createGroup";
import { executeCreateUser, createUserSchema } from "../operations/createUser";
import { executeDeactivateUser, deactivateUserSchema } from "../operations/deactivateUser";
import { executeGetUser, getUserSchema } from "../operations/getUser";
import { executeListApplications, listApplicationsSchema } from "../operations/listApplications";
import { executeListGroups, listGroupsSchema } from "../operations/listGroups";
import { executeListUsers, listUsersSchema } from "../operations/listUsers";
import {
    executeRemoveUserFromGroup,
    removeUserFromGroupSchema
} from "../operations/removeUserFromGroup";
import type { OktaClient, OktaUser, OktaGroup, OktaApplication } from "../client/OktaClient";

// Mock OktaClient factory
function createMockOktaClient(): jest.Mocked<OktaClient> {
    return {
        // User operations
        listUsers: jest.fn(),
        getUser: jest.fn(),
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deactivateUser: jest.fn(),
        activateUser: jest.fn(),
        suspendUser: jest.fn(),
        unsuspendUser: jest.fn(),
        deleteUser: jest.fn(),
        getUserGroups: jest.fn(),
        // Group operations
        listGroups: jest.fn(),
        getGroup: jest.fn(),
        createGroup: jest.fn(),
        updateGroup: jest.fn(),
        deleteGroup: jest.fn(),
        listGroupMembers: jest.fn(),
        addUserToGroup: jest.fn(),
        removeUserFromGroup: jest.fn(),
        // Application operations
        listApplications: jest.fn(),
        getApplication: jest.fn(),
        assignUserToApplication: jest.fn(),
        removeUserFromApplication: jest.fn(),
        assignGroupToApplication: jest.fn(),
        removeGroupFromApplication: jest.fn(),
        // Base client methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<OktaClient>;
}

// Sample test data
const sampleUser: OktaUser = {
    id: "00ub0oNGTSWTBKOLGLNR",
    status: "ACTIVE",
    created: "2023-01-15T10:00:00.000Z",
    activated: "2023-01-15T10:05:00.000Z",
    lastLogin: "2024-01-20T14:30:00.000Z",
    lastUpdated: "2024-01-20T14:30:00.000Z",
    statusChanged: "2023-01-15T10:05:00.000Z",
    type: { id: "oty1abc" },
    profile: {
        login: "john.doe@example.com",
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        displayName: "John Doe",
        mobilePhone: "+1-555-123-4567"
    }
};

const sampleGroup: OktaGroup = {
    id: "00g1emaKYZTWRYYRRTSK",
    created: "2023-01-10T09:00:00.000Z",
    lastUpdated: "2024-01-15T11:00:00.000Z",
    lastMembershipUpdated: "2024-01-18T16:00:00.000Z",
    objectClass: ["okta:user_group"],
    type: "OKTA_GROUP",
    profile: {
        name: "Engineering Team",
        description: "All engineering team members"
    }
};

const sampleApplication: OktaApplication = {
    id: "0oa1gjh63g214q0Hq0g4",
    name: "oidc_client",
    label: "My Web App",
    status: "ACTIVE",
    created: "2023-02-01T12:00:00.000Z",
    lastUpdated: "2024-01-10T09:00:00.000Z",
    signOnMode: "OPENID_CONNECT"
};

describe("Okta Operation Executors", () => {
    let mockClient: jest.Mocked<OktaClient>;

    beforeEach(() => {
        mockClient = createMockOktaClient();
    });

    // ========================================================================
    // USER OPERATIONS
    // ========================================================================

    describe("executeListUsers", () => {
        it("calls client with default params", async () => {
            mockClient.listUsers.mockResolvedValueOnce([]);

            await executeListUsers(mockClient, {});

            expect(mockClient.listUsers).toHaveBeenCalledWith({
                q: undefined,
                filter: undefined,
                limit: 20,
                after: undefined
            });
        });

        it("calls client with custom params", async () => {
            mockClient.listUsers.mockResolvedValueOnce([]);

            await executeListUsers(mockClient, {
                q: "john",
                filter: 'status eq "ACTIVE"',
                limit: 50,
                after: "cursor123"
            });

            expect(mockClient.listUsers).toHaveBeenCalledWith({
                q: "john",
                filter: 'status eq "ACTIVE"',
                limit: 50,
                after: "cursor123"
            });
        });

        it("returns normalized user output", async () => {
            mockClient.listUsers.mockResolvedValueOnce([sampleUser]);

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                users: [
                    {
                        id: "00ub0oNGTSWTBKOLGLNR",
                        status: "ACTIVE",
                        login: "john.doe@example.com",
                        email: "john.doe@example.com",
                        firstName: "John",
                        lastName: "Doe",
                        displayName: "John Doe",
                        created: "2023-01-15T10:00:00.000Z",
                        lastLogin: "2024-01-20T14:30:00.000Z",
                        lastUpdated: "2024-01-20T14:30:00.000Z"
                    }
                ],
                count: 1
            });
        });

        it("returns empty array when no users found", async () => {
            mockClient.listUsers.mockResolvedValueOnce([]);

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                users: [],
                count: 0
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listUsers.mockRejectedValueOnce(new Error("API rate limit exceeded"));

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("API rate limit exceeded");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listUsers.mockRejectedValueOnce("string error");

            const result = await executeListUsers(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list users");
        });
    });

    describe("executeGetUser", () => {
        it("calls client with correct user ID", async () => {
            mockClient.getUser.mockResolvedValueOnce(sampleUser);

            await executeGetUser(mockClient, { userId: "00ub0oNGTSWTBKOLGLNR" });

            expect(mockClient.getUser).toHaveBeenCalledWith("00ub0oNGTSWTBKOLGLNR");
        });

        it("returns normalized user data on success", async () => {
            mockClient.getUser.mockResolvedValueOnce(sampleUser);

            const result = await executeGetUser(mockClient, { userId: "00ub0oNGTSWTBKOLGLNR" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "00ub0oNGTSWTBKOLGLNR",
                status: "ACTIVE",
                login: "john.doe@example.com",
                email: "john.doe@example.com",
                firstName: "John",
                lastName: "Doe",
                displayName: "John Doe",
                mobilePhone: "+1-555-123-4567",
                created: "2023-01-15T10:00:00.000Z",
                activated: "2023-01-15T10:05:00.000Z",
                lastLogin: "2024-01-20T14:30:00.000Z",
                lastUpdated: "2024-01-20T14:30:00.000Z",
                statusChanged: "2023-01-15T10:05:00.000Z"
            });
        });

        it("returns error when user not found", async () => {
            mockClient.getUser.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeGetUser(mockClient, { userId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found.");
        });

        it("returns error on authentication failure", async () => {
            mockClient.getUser.mockRejectedValueOnce(
                new Error("Invalid token provided. Please reconnect.")
            );

            const result = await executeGetUser(mockClient, { userId: "00ub0oNGTSWTBKOLGLNR" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Invalid token provided. Please reconnect.");
        });
    });

    describe("executeCreateUser", () => {
        it("calls client with profile and activation", async () => {
            const newUser: OktaUser = {
                ...sampleUser,
                id: "00ub0oNGTSWTBKOLNEW"
            };
            mockClient.createUser.mockResolvedValueOnce(newUser);

            await executeCreateUser(mockClient, {
                profile: {
                    login: "jane.doe@example.com",
                    email: "jane.doe@example.com",
                    firstName: "Jane",
                    lastName: "Doe"
                },
                activate: true
            });

            expect(mockClient.createUser).toHaveBeenCalledWith({
                profile: {
                    login: "jane.doe@example.com",
                    email: "jane.doe@example.com",
                    firstName: "Jane",
                    lastName: "Doe"
                },
                credentials: undefined,
                activate: true
            });
        });

        it("calls client with password when provided", async () => {
            const newUser: OktaUser = {
                ...sampleUser,
                id: "00ub0oNGTSWTBKOLNEW"
            };
            mockClient.createUser.mockResolvedValueOnce(newUser);

            await executeCreateUser(mockClient, {
                profile: {
                    login: "jane.doe@example.com",
                    email: "jane.doe@example.com"
                },
                password: "SecurePassword123!",
                activate: false
            });

            expect(mockClient.createUser).toHaveBeenCalledWith({
                profile: {
                    login: "jane.doe@example.com",
                    email: "jane.doe@example.com"
                },
                credentials: {
                    password: { value: "SecurePassword123!" }
                },
                activate: false
            });
        });

        it("returns created user data on success", async () => {
            const newUser: OktaUser = {
                ...sampleUser,
                id: "00ub0oNGTSWTBKOLNEW",
                status: "STAGED",
                profile: {
                    login: "jane.doe@example.com",
                    email: "jane.doe@example.com",
                    firstName: "Jane",
                    lastName: "Doe"
                }
            };
            mockClient.createUser.mockResolvedValueOnce(newUser);

            const result = await executeCreateUser(mockClient, {
                profile: {
                    login: "jane.doe@example.com",
                    email: "jane.doe@example.com",
                    firstName: "Jane",
                    lastName: "Doe"
                }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "00ub0oNGTSWTBKOLNEW",
                status: "STAGED",
                login: "jane.doe@example.com",
                email: "jane.doe@example.com",
                firstName: "Jane",
                lastName: "Doe",
                created: "2023-01-15T10:00:00.000Z"
            });
        });

        it("returns error on validation failure", async () => {
            mockClient.createUser.mockRejectedValueOnce(
                new Error("API validation failed: login must be in email format")
            );

            const result = await executeCreateUser(mockClient, {
                profile: {
                    login: "invalid-login",
                    email: "jane@example.com"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toContain("API validation failed");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on duplicate user", async () => {
            mockClient.createUser.mockRejectedValueOnce(
                new Error(
                    "Okta API error: login: An object with this field already exists in the current organization"
                )
            );

            const result = await executeCreateUser(mockClient, {
                profile: {
                    login: "existing@example.com",
                    email: "existing@example.com"
                }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain("already exists");
        });
    });

    describe("executeDeactivateUser", () => {
        it("calls client with correct user ID", async () => {
            mockClient.deactivateUser.mockResolvedValueOnce();

            await executeDeactivateUser(mockClient, { userId: "00ub0oNGTSWTBKOLGLNR" });

            expect(mockClient.deactivateUser).toHaveBeenCalledWith("00ub0oNGTSWTBKOLGLNR");
        });

        it("returns success response", async () => {
            mockClient.deactivateUser.mockResolvedValueOnce();

            const result = await executeDeactivateUser(mockClient, {
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                userId: "00ub0oNGTSWTBKOLGLNR",
                deactivated: true
            });
        });

        it("returns error when user already deactivated", async () => {
            mockClient.deactivateUser.mockRejectedValueOnce(
                new Error("Okta API error: The user is already deactivated")
            );

            const result = await executeDeactivateUser(mockClient, {
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain("already deactivated");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error when user not found", async () => {
            mockClient.deactivateUser.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeDeactivateUser(mockClient, { userId: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
        });
    });

    // ========================================================================
    // GROUP OPERATIONS
    // ========================================================================

    describe("executeListGroups", () => {
        it("calls client with default params", async () => {
            mockClient.listGroups.mockResolvedValueOnce([]);

            await executeListGroups(mockClient, {});

            expect(mockClient.listGroups).toHaveBeenCalledWith({
                q: undefined,
                filter: undefined,
                limit: 20,
                after: undefined
            });
        });

        it("calls client with search query", async () => {
            mockClient.listGroups.mockResolvedValueOnce([]);

            await executeListGroups(mockClient, {
                q: "engineering",
                limit: 100
            });

            expect(mockClient.listGroups).toHaveBeenCalledWith({
                q: "engineering",
                filter: undefined,
                limit: 100,
                after: undefined
            });
        });

        it("returns normalized group output", async () => {
            mockClient.listGroups.mockResolvedValueOnce([sampleGroup]);

            const result = await executeListGroups(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                groups: [
                    {
                        id: "00g1emaKYZTWRYYRRTSK",
                        name: "Engineering Team",
                        description: "All engineering team members",
                        type: "OKTA_GROUP",
                        created: "2023-01-10T09:00:00.000Z",
                        lastUpdated: "2024-01-15T11:00:00.000Z",
                        lastMembershipUpdated: "2024-01-18T16:00:00.000Z"
                    }
                ],
                count: 1
            });
        });

        it("handles groups without description", async () => {
            const groupWithoutDesc: OktaGroup = {
                ...sampleGroup,
                profile: { name: "Simple Group" }
            };
            mockClient.listGroups.mockResolvedValueOnce([groupWithoutDesc]);

            const result = await executeListGroups(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as { groups: Array<{ description?: string }> };
            expect(data.groups[0].description).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.listGroups.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeListGroups(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Permission denied");
        });
    });

    describe("executeCreateGroup", () => {
        it("calls client with name and description", async () => {
            mockClient.createGroup.mockResolvedValueOnce(sampleGroup);

            await executeCreateGroup(mockClient, {
                name: "Engineering Team",
                description: "All engineering team members"
            });

            expect(mockClient.createGroup).toHaveBeenCalledWith({
                name: "Engineering Team",
                description: "All engineering team members"
            });
        });

        it("calls client with name only", async () => {
            mockClient.createGroup.mockResolvedValueOnce(sampleGroup);

            await executeCreateGroup(mockClient, {
                name: "Simple Group"
            });

            expect(mockClient.createGroup).toHaveBeenCalledWith({
                name: "Simple Group",
                description: undefined
            });
        });

        it("returns created group data on success", async () => {
            mockClient.createGroup.mockResolvedValueOnce(sampleGroup);

            const result = await executeCreateGroup(mockClient, {
                name: "Engineering Team",
                description: "All engineering team members"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "00g1emaKYZTWRYYRRTSK",
                name: "Engineering Team",
                description: "All engineering team members",
                type: "OKTA_GROUP",
                created: "2023-01-10T09:00:00.000Z"
            });
        });

        it("returns error on duplicate group name", async () => {
            mockClient.createGroup.mockRejectedValueOnce(
                new Error("Okta API error: A group with this name already exists")
            );

            const result = await executeCreateGroup(mockClient, {
                name: "Existing Group"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain("already exists");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeAddUserToGroup", () => {
        it("calls client with correct IDs", async () => {
            mockClient.addUserToGroup.mockResolvedValueOnce();

            await executeAddUserToGroup(mockClient, {
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(mockClient.addUserToGroup).toHaveBeenCalledWith(
                "00g1emaKYZTWRYYRRTSK",
                "00ub0oNGTSWTBKOLGLNR"
            );
        });

        it("returns success response", async () => {
            mockClient.addUserToGroup.mockResolvedValueOnce();

            const result = await executeAddUserToGroup(mockClient, {
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR",
                added: true
            });
        });

        it("returns error when user not found", async () => {
            mockClient.addUserToGroup.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeAddUserToGroup(mockClient, {
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
        });

        it("returns error when group not found", async () => {
            mockClient.addUserToGroup.mockRejectedValueOnce(new Error("Resource not found."));

            const result = await executeAddUserToGroup(mockClient, {
                groupId: "nonexistent",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
        });

        it("returns error when user already in group", async () => {
            mockClient.addUserToGroup.mockRejectedValueOnce(
                new Error("Okta API error: User is already a member of this group")
            );

            const result = await executeAddUserToGroup(mockClient, {
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain("already a member");
        });
    });

    describe("executeRemoveUserFromGroup", () => {
        it("calls client with correct IDs", async () => {
            mockClient.removeUserFromGroup.mockResolvedValueOnce();

            await executeRemoveUserFromGroup(mockClient, {
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(mockClient.removeUserFromGroup).toHaveBeenCalledWith(
                "00g1emaKYZTWRYYRRTSK",
                "00ub0oNGTSWTBKOLGLNR"
            );
        });

        it("returns success response", async () => {
            mockClient.removeUserFromGroup.mockResolvedValueOnce();

            const result = await executeRemoveUserFromGroup(mockClient, {
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR",
                removed: true
            });
        });

        it("returns error when user not in group", async () => {
            mockClient.removeUserFromGroup.mockRejectedValueOnce(
                new Error("Okta API error: User is not a member of this group")
            );

            const result = await executeRemoveUserFromGroup(mockClient, {
                groupId: "00g1emaKYZTWRYYRRTSK",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain("not a member");
        });
    });

    // ========================================================================
    // APPLICATION OPERATIONS
    // ========================================================================

    describe("executeListApplications", () => {
        it("calls client with default params", async () => {
            mockClient.listApplications.mockResolvedValueOnce([]);

            await executeListApplications(mockClient, {});

            expect(mockClient.listApplications).toHaveBeenCalledWith({
                q: undefined,
                filter: undefined,
                limit: 20,
                after: undefined
            });
        });

        it("calls client with search query", async () => {
            mockClient.listApplications.mockResolvedValueOnce([]);

            await executeListApplications(mockClient, {
                q: "webapp",
                limit: 50
            });

            expect(mockClient.listApplications).toHaveBeenCalledWith({
                q: "webapp",
                filter: undefined,
                limit: 50,
                after: undefined
            });
        });

        it("returns normalized application output", async () => {
            mockClient.listApplications.mockResolvedValueOnce([sampleApplication]);

            const result = await executeListApplications(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                applications: [
                    {
                        id: "0oa1gjh63g214q0Hq0g4",
                        name: "oidc_client",
                        label: "My Web App",
                        status: "ACTIVE",
                        signOnMode: "OPENID_CONNECT",
                        created: "2023-02-01T12:00:00.000Z",
                        lastUpdated: "2024-01-10T09:00:00.000Z"
                    }
                ],
                count: 1
            });
        });

        it("returns multiple applications", async () => {
            const secondApp: OktaApplication = {
                id: "0oa1gjh63g214q0Hq0g5",
                name: "saml_app",
                label: "My SAML App",
                status: "INACTIVE",
                created: "2023-03-01T12:00:00.000Z",
                lastUpdated: "2024-01-05T09:00:00.000Z",
                signOnMode: "SAML_2_0"
            };
            mockClient.listApplications.mockResolvedValueOnce([sampleApplication, secondApp]);

            const result = await executeListApplications(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as { applications: unknown[]; count: number };
            expect(data.applications).toHaveLength(2);
            expect(data.count).toBe(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listApplications.mockRejectedValueOnce(
                new Error("You do not have permission to perform this action.")
            );

            const result = await executeListApplications(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain("permission");
        });
    });

    describe("executeAssignUserToApplication", () => {
        it("calls client with correct IDs", async () => {
            mockClient.assignUserToApplication.mockResolvedValueOnce();

            await executeAssignUserToApplication(mockClient, {
                appId: "0oa1gjh63g214q0Hq0g4",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(mockClient.assignUserToApplication).toHaveBeenCalledWith(
                "0oa1gjh63g214q0Hq0g4",
                "00ub0oNGTSWTBKOLGLNR"
            );
        });

        it("returns success response", async () => {
            mockClient.assignUserToApplication.mockResolvedValueOnce();

            const result = await executeAssignUserToApplication(mockClient, {
                appId: "0oa1gjh63g214q0Hq0g4",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                appId: "0oa1gjh63g214q0Hq0g4",
                userId: "00ub0oNGTSWTBKOLGLNR",
                assigned: true
            });
        });

        it("returns error when application not found", async () => {
            mockClient.assignUserToApplication.mockRejectedValueOnce(
                new Error("Resource not found.")
            );

            const result = await executeAssignUserToApplication(mockClient, {
                appId: "nonexistent",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found.");
        });

        it("returns error when user already assigned", async () => {
            mockClient.assignUserToApplication.mockRejectedValueOnce(
                new Error("Okta API error: User is already assigned to this application")
            );

            const result = await executeAssignUserToApplication(mockClient, {
                appId: "0oa1gjh63g214q0Hq0g4",
                userId: "00ub0oNGTSWTBKOLGLNR"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain("already assigned");
        });
    });

    // ========================================================================
    // SCHEMA VALIDATION
    // ========================================================================

    describe("schema validation", () => {
        describe("listUsersSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listUsersSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with search query", () => {
                const result = listUsersSchema.safeParse({
                    q: "john.doe@example.com"
                });
                expect(result.success).toBe(true);
            });

            it("validates with filter", () => {
                const result = listUsersSchema.safeParse({
                    filter: 'status eq "ACTIVE"'
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination", () => {
                const result = listUsersSchema.safeParse({
                    limit: 100,
                    after: "cursor123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects limit > 200", () => {
                const result = listUsersSchema.safeParse({
                    limit: 500
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit < 1", () => {
                const result = listUsersSchema.safeParse({
                    limit: 0
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listUsersSchema.parse({});
                expect(result.limit).toBe(20);
            });
        });

        describe("getUserSchema", () => {
            it("validates with user ID", () => {
                const result = getUserSchema.safeParse({
                    userId: "00ub0oNGTSWTBKOLGLNR"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing user ID", () => {
                const result = getUserSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty user ID", () => {
                const result = getUserSchema.safeParse({
                    userId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createUserSchema", () => {
            it("validates minimal input", () => {
                const result = createUserSchema.safeParse({
                    profile: {
                        login: "john@example.com",
                        email: "john@example.com"
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createUserSchema.safeParse({
                    profile: {
                        login: "john@example.com",
                        email: "john@example.com",
                        firstName: "John",
                        lastName: "Doe",
                        displayName: "John Doe",
                        mobilePhone: "+1-555-123-4567"
                    },
                    password: "SecurePass123!",
                    activate: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing login", () => {
                const result = createUserSchema.safeParse({
                    profile: {
                        email: "john@example.com"
                    }
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid email", () => {
                const result = createUserSchema.safeParse({
                    profile: {
                        login: "john",
                        email: "not-an-email"
                    }
                });
                expect(result.success).toBe(false);
            });

            it("rejects short password", () => {
                const result = createUserSchema.safeParse({
                    profile: {
                        login: "john@example.com",
                        email: "john@example.com"
                    },
                    password: "short"
                });
                expect(result.success).toBe(false);
            });

            it("applies default activate value", () => {
                const result = createUserSchema.parse({
                    profile: {
                        login: "john@example.com",
                        email: "john@example.com"
                    }
                });
                expect(result.activate).toBe(true);
            });
        });

        describe("deactivateUserSchema", () => {
            it("validates with user ID", () => {
                const result = deactivateUserSchema.safeParse({
                    userId: "00ub0oNGTSWTBKOLGLNR"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing user ID", () => {
                const result = deactivateUserSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listGroupsSchema", () => {
            it("validates empty input", () => {
                const result = listGroupsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with search", () => {
                const result = listGroupsSchema.safeParse({
                    q: "engineering"
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listGroupsSchema.parse({});
                expect(result.limit).toBe(20);
            });
        });

        describe("createGroupSchema", () => {
            it("validates with name only", () => {
                const result = createGroupSchema.safeParse({
                    name: "Engineering Team"
                });
                expect(result.success).toBe(true);
            });

            it("validates with name and description", () => {
                const result = createGroupSchema.safeParse({
                    name: "Engineering Team",
                    description: "All engineers"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createGroupSchema.safeParse({
                    name: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing name", () => {
                const result = createGroupSchema.safeParse({
                    description: "Some description"
                });
                expect(result.success).toBe(false);
            });

            it("rejects name > 255 characters", () => {
                const result = createGroupSchema.safeParse({
                    name: "a".repeat(256)
                });
                expect(result.success).toBe(false);
            });

            it("rejects description > 1024 characters", () => {
                const result = createGroupSchema.safeParse({
                    name: "Test Group",
                    description: "a".repeat(1025)
                });
                expect(result.success).toBe(false);
            });
        });

        describe("addUserToGroupSchema", () => {
            it("validates with both IDs", () => {
                const result = addUserToGroupSchema.safeParse({
                    groupId: "00g1emaKYZTWRYYRRTSK",
                    userId: "00ub0oNGTSWTBKOLGLNR"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing groupId", () => {
                const result = addUserToGroupSchema.safeParse({
                    userId: "00ub0oNGTSWTBKOLGLNR"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing userId", () => {
                const result = addUserToGroupSchema.safeParse({
                    groupId: "00g1emaKYZTWRYYRRTSK"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("removeUserFromGroupSchema", () => {
            it("validates with both IDs", () => {
                const result = removeUserFromGroupSchema.safeParse({
                    groupId: "00g1emaKYZTWRYYRRTSK",
                    userId: "00ub0oNGTSWTBKOLGLNR"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty IDs", () => {
                const result = removeUserFromGroupSchema.safeParse({
                    groupId: "",
                    userId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listApplicationsSchema", () => {
            it("validates empty input", () => {
                const result = listApplicationsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with search", () => {
                const result = listApplicationsSchema.safeParse({
                    q: "webapp"
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listApplicationsSchema.parse({});
                expect(result.limit).toBe(20);
            });
        });

        describe("assignUserToApplicationSchema", () => {
            it("validates with both IDs", () => {
                const result = assignUserToApplicationSchema.safeParse({
                    appId: "0oa1gjh63g214q0Hq0g4",
                    userId: "00ub0oNGTSWTBKOLGLNR"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing appId", () => {
                const result = assignUserToApplicationSchema.safeParse({
                    userId: "00ub0oNGTSWTBKOLGLNR"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing userId", () => {
                const result = assignUserToApplicationSchema.safeParse({
                    appId: "0oa1gjh63g214q0Hq0g4"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty IDs", () => {
                const result = assignUserToApplicationSchema.safeParse({
                    appId: "",
                    userId: ""
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
