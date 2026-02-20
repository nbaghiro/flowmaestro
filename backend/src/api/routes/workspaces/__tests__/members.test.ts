/**
 * Workspace Members Tests
 *
 * Tests for workspace member management: list, invite, remove, and update-role.
 */

import { FastifyInstance } from "fastify";
import {
    mockInvitationRepo,
    mockUserRepo,
    mockWorkspaceRepoInstance,
    mockMemberRepoInstance,
    createMockWorkspace,
    resetAllMocks,
    createWorkspaceTestServer,
    closeWorkspaceTestServer,
    createTestUser,
    authenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "./helpers/test-utils";
import type { TestUser } from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../services/workspace", () => ({
    workspaceService: {
        createWorkspace: jest.fn(),
        getWorkspacesForUser: jest.fn(),
        getWorkspaceWithStats: jest.fn(),
        updateWorkspace: jest.fn(),
        deleteWorkspace: jest.fn()
    },
    creditService: {
        getBalance: jest.fn(),
        getTransactions: jest.fn(),
        estimateWorkflowCredits: jest.fn()
    }
}));

jest.mock("../../../../storage/repositories/WorkspaceInvitationRepository", () => ({
    WorkspaceInvitationRepository: jest.fn().mockImplementation(() => mockInvitationRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceCreditRepository", () => ({
    WorkspaceCreditRepository: jest.fn().mockImplementation(() => ({}))
}));

jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../services/email/EmailService", () => ({
    emailService: {
        sendWorkspaceInvitation: jest.fn().mockResolvedValue(undefined)
    }
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Workspace Members", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;

    const mockWorkspace = createMockWorkspace();

    beforeAll(async () => {
        fastify = await createWorkspaceTestServer();
    });

    afterAll(async () => {
        await closeWorkspaceTestServer(fastify);
    });

    beforeEach(() => {
        testUser = createTestUser();
        resetAllMocks();
    });

    // =========================================================================
    // GET /workspaces/:workspaceId/members - List Members
    // =========================================================================
    describe("GET /workspaces/:workspaceId/members", () => {
        it("should list workspace members", async () => {
            const members = [
                { id: "member-1", user_id: "user-1", role: "owner", name: "Owner" },
                { id: "member-2", user_id: "user-2", role: "member", name: "Member" }
            ];
            mockMemberRepoInstance.findByWorkspaceIdWithUsers.mockResolvedValueOnce(members);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(2);
        });
    });

    // =========================================================================
    // POST /workspaces/:workspaceId/members/invite - Invite Member
    // =========================================================================
    describe("POST /workspaces/:workspaceId/members/invite", () => {
        it("should invite a member", async () => {
            mockWorkspaceRepoInstance.findById.mockResolvedValueOnce({
                ...mockWorkspace,
                max_members: 10
            });
            mockMemberRepoInstance.getMemberCount.mockResolvedValueOnce(2);
            mockUserRepo.findByEmail.mockResolvedValueOnce(null);
            mockInvitationRepo.findPendingByWorkspaceAndEmail.mockResolvedValueOnce(null);
            mockInvitationRepo.create.mockResolvedValueOnce({
                id: "inv-1",
                email: "new@example.com",
                role: "member",
                status: "pending",
                expires_at: new Date(Date.now() + 86400000),
                created_at: new Date()
            });
            mockUserRepo.findById.mockResolvedValueOnce({
                id: testUser.id,
                name: "Test",
                email: testUser.email
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/invite`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    email: "new@example.com",
                    role: "member"
                }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { email: string } }>();
            expect(body.data.email).toBe("new@example.com");
        });

        it("should return 400 for invalid email", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/invite`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    email: "invalid-email",
                    role: "member"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Valid email");
        });

        it("should return 400 for invalid role", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/invite`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    email: "test@example.com",
                    role: "invalid"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Invalid role");
        });

        it("should return 400 when member limit reached", async () => {
            const limitedWorkspace = { ...mockWorkspace, max_members: 2 };
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(limitedWorkspace)
                .mockResolvedValueOnce(limitedWorkspace);
            mockMemberRepoInstance.getMemberCount.mockResolvedValueOnce(2);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/invite`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    email: "new@example.com",
                    role: "member"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("member limit");
        });

        it("should return 400 when user already a member", async () => {
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(mockWorkspace)
                .mockResolvedValueOnce(mockWorkspace);
            mockMemberRepoInstance.getMemberCount.mockResolvedValueOnce(2);
            mockUserRepo.findByEmail.mockResolvedValueOnce({ id: "existing-user" });
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "test-member", role: "owner" })
                .mockResolvedValueOnce({ id: "existing-member" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/invite`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    email: "existing@example.com",
                    role: "member"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already a member");
        });

        it("should return 400 when invitation already pending", async () => {
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(mockWorkspace)
                .mockResolvedValueOnce(mockWorkspace);
            mockMemberRepoInstance.getMemberCount.mockResolvedValueOnce(2);
            mockUserRepo.findByEmail.mockResolvedValueOnce(null);
            mockInvitationRepo.findPendingByWorkspaceAndEmail.mockResolvedValueOnce({
                id: "existing-inv"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/invite`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    email: "pending@example.com",
                    role: "member"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already been sent");
        });
    });

    // =========================================================================
    // DELETE /workspaces/:workspaceId/members/:userId - Remove Member
    // =========================================================================
    describe("DELETE /workspaces/:workspaceId/members/:userId", () => {
        it("should remove a member", async () => {
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" })
                .mockResolvedValueOnce({ id: "target", role: "member" });
            mockMemberRepoInstance.deleteByWorkspaceAndUser.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/user-to-remove`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("removed");
        });

        it("should return 404 when member not found", async () => {
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" })
                .mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/non-existent`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 when trying to remove owner", async () => {
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" })
                .mockResolvedValueOnce({ id: "target", role: "owner" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/owner-id`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Cannot remove the workspace owner");
        });
    });

    // =========================================================================
    // PUT /workspaces/:workspaceId/members/:userId/role - Update Member Role
    // =========================================================================
    describe("PUT /workspaces/:workspaceId/members/:userId/role", () => {
        it("should update member role", async () => {
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" })
                .mockResolvedValueOnce({ id: "target", role: "member" });
            mockMemberRepoInstance.updateRole.mockResolvedValueOnce({ role: "admin" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/user-1/role`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    role: "admin"
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should return 400 for invalid role", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/user-1/role`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    role: "invalid"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Invalid role");
        });

        it("should return 400 when trying to change owner role", async () => {
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" })
                .mockResolvedValueOnce({ id: "target", role: "owner" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/owner-id/role`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    role: "admin"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Cannot change the owner's role");
        });

        it("should return 404 when member not found", async () => {
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" })
                .mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/members/non-existent/role`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    role: "admin"
                }
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
