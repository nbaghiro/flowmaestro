/**
 * Workspace Routes Integration Tests
 *
 * Tests for:
 * - Workspace CRUD: create, list, get, update, delete, upgrade
 * - Members: list, invite, remove, update-role
 * - Invitations: list, revoke, get, accept, decline
 * - Credits: balance, transactions, estimate
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    TestUser,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo
} from "../../../../../__tests__/helpers/fastify-test-client";

// Mock WorkspaceService
const mockWorkspaceService = {
    createWorkspace: jest.fn(),
    getWorkspacesForUser: jest.fn(),
    getWorkspaceWithStats: jest.fn(),
    updateWorkspace: jest.fn(),
    deleteWorkspace: jest.fn()
};

const mockCreditService = {
    getBalance: jest.fn(),
    getTransactions: jest.fn(),
    estimateWorkflowCredits: jest.fn()
};

jest.mock("../../../../services/workspace", () => ({
    workspaceService: mockWorkspaceService,
    creditService: mockCreditService
}));

// Alias the exported mocks for convenience
const mockWorkspaceRepoInstance = mockWorkspaceRepo;
const mockMemberRepoInstance = mockWorkspaceMemberRepo;

// Mock WorkspaceInvitationRepository
const mockInvitationRepo = {
    findByWorkspaceId: jest.fn(),
    findPendingByWorkspaceId: jest.fn(),
    findPendingByWorkspaceAndEmail: jest.fn(),
    findById: jest.fn(),
    findByToken: jest.fn(),
    findByTokenWithDetails: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    markAsAccepted: jest.fn(),
    markAsDeclined: jest.fn()
};

jest.mock("../../../../storage/repositories/WorkspaceInvitationRepository", () => ({
    WorkspaceInvitationRepository: jest.fn().mockImplementation(() => mockInvitationRepo)
}));

// Mock WorkspaceCreditRepository
const mockCreditRepo = {
    getBalance: jest.fn(),
    addBonusCredits: jest.fn(),
    createTransaction: jest.fn()
};

jest.mock("../../../../storage/repositories/WorkspaceCreditRepository", () => ({
    WorkspaceCreditRepository: jest.fn().mockImplementation(() => mockCreditRepo)
}));

// Mock UserRepository
const mockUserRepo = {
    findByEmail: jest.fn(),
    findById: jest.fn()
};

jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

// Mock EmailService
jest.mock("../../../../services/email/EmailService", () => ({
    emailService: {
        sendWorkspaceInvitation: jest.fn().mockResolvedValue(undefined)
    }
}));

describe("Workspace Routes", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;
    const testWorkspaceId = "test-workspace-id";

    const mockWorkspace = {
        id: testWorkspaceId,
        name: "Test Workspace",
        type: "personal",
        owner_id: "user-1",
        description: "A test workspace",
        max_workflows: 100,
        max_agents: 50,
        max_knowledge_bases: 20,
        max_kb_chunks: 10000,
        max_members: 10,
        max_connections: 50,
        execution_history_days: 30,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01")
    };

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        testUser = createTestUser();
        jest.clearAllMocks();
    });

    // =========================================================================
    // POST /workspaces - Create Workspace
    // =========================================================================
    describe("POST /workspaces", () => {
        it("should create a workspace", async () => {
            mockWorkspaceRepoInstance.isNameAvailableForOwner.mockResolvedValueOnce(true);
            mockWorkspaceService.createWorkspace.mockResolvedValueOnce(mockWorkspace);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces",
                payload: {
                    name: "New Workspace"
                },
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { id: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(testWorkspaceId);
        });

        it("should return 400 when name is missing", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("name is required");
        });

        it("should return 400 when name exceeds 100 characters", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces",
                payload: {
                    name: "a".repeat(101)
                },
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("100 characters");
        });

        it("should return 400 when name already exists for owner", async () => {
            mockWorkspaceRepoInstance.isNameAvailableForOwner.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces",
                payload: {
                    name: "Existing Workspace"
                },
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already have a workspace");
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workspaces",
                payload: { name: "Test" }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /workspaces - List Workspaces
    // =========================================================================
    describe("GET /workspaces", () => {
        it("should list workspaces for user", async () => {
            const workspaces = [
                mockWorkspace,
                { ...mockWorkspace, id: "workspace-2", name: "Second" }
            ];
            mockWorkspaceService.getWorkspacesForUser.mockResolvedValueOnce(workspaces);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workspaces",
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
        });

        it("should return empty array for user with no workspaces", async () => {
            mockWorkspaceService.getWorkspacesForUser.mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workspaces",
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(0);
        });
    });

    // =========================================================================
    // GET /workspaces/:workspaceId - Get Workspace
    // =========================================================================
    describe("GET /workspaces/:workspaceId", () => {
        it("should return workspace by ID", async () => {
            mockWorkspaceService.getWorkspaceWithStats.mockResolvedValueOnce(mockWorkspace);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${testWorkspaceId}`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { workspace: { id: string } } }>();
            expect(body.success).toBe(true);
            expect(body.data.workspace.id).toBe(testWorkspaceId);
        });

        it("should return 404 for non-existent workspace", async () => {
            mockWorkspaceService.getWorkspaceWithStats.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workspaces/non-existent",
                workspaceId: "non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // PUT /workspaces/:workspaceId - Update Workspace
    // =========================================================================
    describe("PUT /workspaces/:workspaceId", () => {
        it("should update workspace", async () => {
            mockWorkspaceRepoInstance.isNameAvailableForOwner.mockResolvedValueOnce(true);
            const updated = { ...mockWorkspace, name: "Updated Name" };
            mockWorkspaceService.updateWorkspace.mockResolvedValueOnce(updated);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}`,
                workspaceId: testWorkspaceId,
                payload: {
                    name: "Updated Name"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { name: string } }>();
            expect(body.data.name).toBe("Updated Name");
        });

        it("should return 400 for empty name", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}`,
                workspaceId: testWorkspaceId,
                payload: {
                    name: "   "
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("cannot be empty");
        });

        it("should return 400 for duplicate name", async () => {
            mockWorkspaceRepoInstance.isNameAvailableForOwner.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}`,
                workspaceId: testWorkspaceId,
                payload: {
                    name: "Existing Name"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already have another workspace");
        });

        it("should return 404 when workspace not found", async () => {
            mockWorkspaceRepoInstance.isNameAvailableForOwner.mockResolvedValueOnce(true);
            mockWorkspaceService.updateWorkspace.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}`,
                workspaceId: testWorkspaceId,
                payload: {
                    name: "New Name"
                }
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // DELETE /workspaces/:workspaceId - Delete Workspace
    // =========================================================================
    describe("DELETE /workspaces/:workspaceId", () => {
        it("should delete workspace", async () => {
            mockWorkspaceService.deleteWorkspace.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
            expect(body.message).toContain("deleted");
        });

        it("should return 404 when workspace not found", async () => {
            mockWorkspaceService.deleteWorkspace.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // POST /workspaces/:workspaceId/upgrade - Upgrade Workspace
    // =========================================================================
    describe("POST /workspaces/:workspaceId/upgrade", () => {
        it("should upgrade workspace to pro plan", async () => {
            mockWorkspaceRepoInstance.findById.mockResolvedValueOnce({
                ...mockWorkspace,
                type: "free"
            });
            const upgradedWorkspace = { ...mockWorkspace, type: "pro" };
            mockWorkspaceRepoInstance.update.mockResolvedValueOnce(upgradedWorkspace);
            mockCreditRepo.getBalance.mockResolvedValueOnce({
                subscription: 0,
                purchased: 0,
                bonus: 0
            });
            mockCreditRepo.addBonusCredits.mockResolvedValueOnce(undefined);
            mockCreditRepo.createTransaction.mockResolvedValueOnce(undefined);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/upgrade`,
                workspaceId: testWorkspaceId,
                payload: {
                    plan: "pro"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: { type: string };
                message: string;
            }>();
            expect(body.success).toBe(true);
            expect(body.data.type).toBe("pro");
            expect(body.message).toContain("pro");
        });

        it("should return 400 for invalid plan", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/upgrade`,
                workspaceId: testWorkspaceId,
                payload: {
                    plan: "invalid"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Invalid plan");
        });

        it("should return 400 when already on requested plan", async () => {
            // First call is for middleware, second is for route handler
            const proWorkspace = { ...mockWorkspace, type: "pro" };
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(proWorkspace) // middleware
                .mockResolvedValueOnce(proWorkspace); // route handler

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/upgrade`,
                workspaceId: testWorkspaceId,
                payload: {
                    plan: "pro"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already on the pro plan");
        });

        it("should return 404 when workspace not found", async () => {
            // First call (middleware) returns workspace, second call (handler) returns null
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(mockWorkspace) // middleware needs valid workspace
                .mockResolvedValueOnce(null); // handler gets null

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/upgrade`,
                workspaceId: testWorkspaceId,
                payload: {
                    plan: "pro"
                }
            });

            expect(response.statusCode).toBe(404);
        });
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
                url: `/workspaces/${testWorkspaceId}/members`,
                workspaceId: testWorkspaceId
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
                url: `/workspaces/${testWorkspaceId}/members/invite`,
                workspaceId: testWorkspaceId,
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
                url: `/workspaces/${testWorkspaceId}/members/invite`,
                workspaceId: testWorkspaceId,
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
                url: `/workspaces/${testWorkspaceId}/members/invite`,
                workspaceId: testWorkspaceId,
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
            // Middleware calls findById, then route handler calls findById again
            const limitedWorkspace = { ...mockWorkspace, max_members: 2 };
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(limitedWorkspace) // middleware
                .mockResolvedValueOnce(limitedWorkspace); // route handler
            mockMemberRepoInstance.getMemberCount.mockResolvedValueOnce(2);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/members/invite`,
                workspaceId: testWorkspaceId,
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
            // Middleware calls findById, route handler calls it again
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(mockWorkspace)
                .mockResolvedValueOnce(mockWorkspace);
            mockMemberRepoInstance.getMemberCount.mockResolvedValueOnce(2);
            mockUserRepo.findByEmail.mockResolvedValueOnce({ id: "existing-user" });
            // Middleware calls findByWorkspaceAndUser, then route handler calls it for the invited user
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "test-member", role: "owner" }) // middleware
                .mockResolvedValueOnce({ id: "existing-member" }); // route handler check

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/members/invite`,
                workspaceId: testWorkspaceId,
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
                url: `/workspaces/${testWorkspaceId}/members/invite`,
                workspaceId: testWorkspaceId,
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
            // Middleware calls findByWorkspaceAndUser for auth, then route handler calls it for target
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" }) // middleware - actor is owner
                .mockResolvedValueOnce({ id: "target", role: "member" }); // route handler - target is member
            mockMemberRepoInstance.deleteByWorkspaceAndUser.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}/members/user-to-remove`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("removed");
        });

        it("should return 404 when member not found", async () => {
            // Middleware returns owner (actor), route handler returns null (target not found)
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" }) // middleware
                .mockResolvedValueOnce(null); // route handler

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}/members/non-existent`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 when trying to remove owner", async () => {
            // Middleware returns owner (actor), route handler returns owner (target)
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" }) // middleware
                .mockResolvedValueOnce({ id: "target", role: "owner" }); // route handler

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}/members/owner-id`,
                workspaceId: testWorkspaceId
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
            // Middleware calls findByWorkspaceAndUser for auth, then route handler calls for target
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" }) // middleware
                .mockResolvedValueOnce({ id: "target", role: "member" }); // route handler
            mockMemberRepoInstance.updateRole.mockResolvedValueOnce({ role: "admin" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}/members/user-1/role`,
                workspaceId: testWorkspaceId,
                payload: {
                    role: "admin"
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should return 400 for invalid role", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}/members/user-1/role`,
                workspaceId: testWorkspaceId,
                payload: {
                    role: "invalid"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Invalid role");
        });

        it("should return 400 when trying to change owner role", async () => {
            // Middleware: actor is owner, Route handler: target is owner
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" }) // middleware
                .mockResolvedValueOnce({ id: "target", role: "owner" }); // route handler

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}/members/owner-id/role`,
                workspaceId: testWorkspaceId,
                payload: {
                    role: "admin"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Cannot change the owner's role");
        });

        it("should return 404 when member not found", async () => {
            // Middleware: actor is owner, Route handler: target not found
            mockMemberRepoInstance.findByWorkspaceAndUser
                .mockResolvedValueOnce({ id: "actor", role: "owner" }) // middleware
                .mockResolvedValueOnce(null); // route handler

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${testWorkspaceId}/members/non-existent/role`,
                workspaceId: testWorkspaceId,
                payload: {
                    role: "admin"
                }
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // GET /workspaces/:workspaceId/invitations - List Invitations
    // =========================================================================
    describe("GET /workspaces/:workspaceId/invitations", () => {
        it("should list pending invitations by default", async () => {
            const invitations = [
                {
                    id: "inv-1",
                    email: "a@test.com",
                    role: "member",
                    status: "pending",
                    invited_by: "user-1",
                    expires_at: new Date(),
                    created_at: new Date()
                }
            ];
            mockInvitationRepo.findPendingByWorkspaceId.mockResolvedValueOnce(invitations);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${testWorkspaceId}/invitations`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(1);
        });

        it("should list all invitations with status=all", async () => {
            const invitations = [
                {
                    id: "inv-1",
                    email: "a@test.com",
                    role: "member",
                    status: "pending",
                    invited_by: "user-1",
                    expires_at: new Date(),
                    created_at: new Date()
                },
                {
                    id: "inv-2",
                    email: "b@test.com",
                    role: "viewer",
                    status: "accepted",
                    invited_by: "user-1",
                    expires_at: new Date(),
                    created_at: new Date()
                }
            ];
            mockInvitationRepo.findByWorkspaceId.mockResolvedValueOnce(invitations);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${testWorkspaceId}/invitations?status=all`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(2);
        });
    });

    // =========================================================================
    // DELETE /workspaces/:workspaceId/invitations/:invitationId - Revoke Invitation
    // =========================================================================
    describe("DELETE /workspaces/:workspaceId/invitations/:invitationId", () => {
        it("should revoke pending invitation", async () => {
            mockInvitationRepo.findById.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: testWorkspaceId,
                status: "pending"
            });
            mockInvitationRepo.delete.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}/invitations/inv-1`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("revoked");
        });

        it("should return 404 when invitation not found", async () => {
            mockInvitationRepo.findById.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}/invitations/non-existent`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 when invitation not pending", async () => {
            mockInvitationRepo.findById.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: testWorkspaceId,
                status: "accepted"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${testWorkspaceId}/invitations/inv-1`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("pending invitations");
        });
    });

    // =========================================================================
    // GET /workspaces/invitations/:token - Get Invitation (Public)
    // =========================================================================
    describe("GET /workspaces/invitations/:token", () => {
        it("should return invitation details", async () => {
            mockInvitationRepo.findByTokenWithDetails.mockResolvedValueOnce({
                id: "inv-1",
                email: "test@example.com",
                role: "member",
                status: "pending",
                expiresAt: new Date(Date.now() + 86400000),
                workspace: { id: testWorkspaceId, name: "Test Workspace" },
                inviter: { name: "Inviter" }
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/workspaces/invitations/valid-token"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { email: string } }>();
            expect(body.data.email).toBe("test@example.com");
        });

        it("should return 404 for invalid token", async () => {
            mockInvitationRepo.findByTokenWithDetails.mockResolvedValueOnce(null);

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/workspaces/invitations/invalid-token"
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for expired invitation", async () => {
            mockInvitationRepo.findByTokenWithDetails.mockResolvedValueOnce({
                id: "inv-1",
                email: "test@example.com",
                status: "pending",
                expiresAt: new Date(Date.now() - 86400000) // Expired yesterday
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/workspaces/invitations/expired-token"
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("expired");
        });

        it("should return 400 for non-pending invitation", async () => {
            mockInvitationRepo.findByTokenWithDetails.mockResolvedValueOnce({
                id: "inv-1",
                email: "test@example.com",
                status: "accepted",
                expiresAt: new Date(Date.now() + 86400000)
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/workspaces/invitations/accepted-token"
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already been accepted");
        });
    });

    // =========================================================================
    // POST /workspaces/invitations/:token/accept - Accept Invitation
    // =========================================================================
    describe("POST /workspaces/invitations/:token/accept", () => {
        it("should accept invitation", async () => {
            mockInvitationRepo.findByToken.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: testWorkspaceId,
                email: testUser.email,
                role: "member",
                status: "pending",
                expires_at: new Date(Date.now() + 86400000),
                invited_by: "inviter-id",
                created_at: new Date()
            });
            mockMemberRepoInstance.findByWorkspaceAndUser.mockResolvedValueOnce(null);
            mockMemberRepoInstance.create.mockResolvedValueOnce({});
            mockInvitationRepo.markAsAccepted.mockResolvedValueOnce(undefined);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces/invitations/valid-token/accept",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { workspaceId: string } }>();
            expect(body.data.workspaceId).toBe(testWorkspaceId);
        });

        it("should return 404 for invalid token", async () => {
            mockInvitationRepo.findByToken.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces/invitations/invalid-token/accept",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 when email doesnt match", async () => {
            mockInvitationRepo.findByToken.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: testWorkspaceId,
                email: "other@example.com",
                status: "pending",
                expires_at: new Date(Date.now() + 86400000)
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces/invitations/valid-token/accept",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(403);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("different email");
        });

        it("should return 400 when already a member", async () => {
            mockInvitationRepo.findByToken.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: testWorkspaceId,
                email: testUser.email,
                status: "pending",
                expires_at: new Date(Date.now() + 86400000)
            });
            mockMemberRepoInstance.findByWorkspaceAndUser.mockResolvedValueOnce({ id: "existing" });
            mockInvitationRepo.markAsAccepted.mockResolvedValueOnce(undefined);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces/invitations/valid-token/accept",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already a member");
        });
    });

    // =========================================================================
    // POST /workspaces/invitations/:token/decline - Decline Invitation
    // =========================================================================
    describe("POST /workspaces/invitations/:token/decline", () => {
        it("should decline invitation", async () => {
            mockInvitationRepo.findByToken.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: testWorkspaceId,
                email: testUser.email,
                status: "pending"
            });
            mockInvitationRepo.markAsDeclined.mockResolvedValueOnce(undefined);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces/invitations/valid-token/decline",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("declined");
        });

        it("should return 404 for invalid token", async () => {
            mockInvitationRepo.findByToken.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces/invitations/invalid-token/decline",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 when email doesnt match", async () => {
            mockInvitationRepo.findByToken.mockResolvedValueOnce({
                id: "inv-1",
                email: "other@example.com",
                status: "pending"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workspaces/invitations/valid-token/decline",
                payload: {},
                skipWorkspaceHeader: true
            });

            expect(response.statusCode).toBe(403);
        });
    });

    // =========================================================================
    // GET /workspaces/:workspaceId/credits/balance - Get Credits Balance
    // =========================================================================
    describe("GET /workspaces/:workspaceId/credits/balance", () => {
        it("should return credit balance", async () => {
            mockCreditService.getBalance.mockResolvedValueOnce({
                subscription: 1000,
                purchased: 500,
                bonus: 100,
                available: 1600
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${testWorkspaceId}/credits/balance`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { available: number } }>();
            expect(body.data.available).toBe(1600);
        });

        it("should return 404 when credits not found", async () => {
            mockCreditService.getBalance.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${testWorkspaceId}/credits/balance`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // GET /workspaces/:workspaceId/credits/transactions - Get Credit Transactions
    // =========================================================================
    describe("GET /workspaces/:workspaceId/credits/transactions", () => {
        it("should return credit transactions", async () => {
            const transactions = [
                { id: "tx-1", amount: -10, type: "usage" },
                { id: "tx-2", amount: 1000, type: "subscription" }
            ];
            mockCreditService.getTransactions.mockResolvedValueOnce(transactions);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${testWorkspaceId}/credits/transactions`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(2);
        });

        it("should support pagination", async () => {
            mockCreditService.getTransactions.mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${testWorkspaceId}/credits/transactions?limit=10&offset=5`,
                workspaceId: testWorkspaceId
            });

            expect(response.statusCode).toBe(200);
            // Verify the service was called with pagination params
            expect(mockCreditService.getTransactions).toHaveBeenCalledWith(
                testWorkspaceId,
                expect.objectContaining({ limit: 10 })
            );
        });
    });

    // =========================================================================
    // POST /workspaces/:workspaceId/credits/estimate - Estimate Credits
    // =========================================================================
    describe("POST /workspaces/:workspaceId/credits/estimate", () => {
        it("should estimate credits for workflow", async () => {
            mockCreditService.estimateWorkflowCredits.mockResolvedValueOnce({
                totalCredits: 50,
                breakdown: []
            });
            mockCreditService.getBalance.mockResolvedValueOnce({ available: 1000 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/credits/estimate`,
                workspaceId: testWorkspaceId,
                payload: {
                    workflowDefinition: {
                        nodes: [{ id: "node-1", type: "llm" }]
                    }
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { hasEnoughCredits: boolean } }>();
            expect(body.data.hasEnoughCredits).toBe(true);
        });

        it("should return 400 for invalid workflow definition", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/credits/estimate`,
                workspaceId: testWorkspaceId,
                payload: {
                    workflowDefinition: {}
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("nodes array");
        });

        it("should indicate insufficient credits", async () => {
            mockCreditService.estimateWorkflowCredits.mockResolvedValueOnce({
                totalCredits: 500,
                breakdown: []
            });
            mockCreditService.getBalance.mockResolvedValueOnce({ available: 100 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${testWorkspaceId}/credits/estimate`,
                workspaceId: testWorkspaceId,
                payload: {
                    workflowDefinition: {
                        nodes: [{ id: "node-1", type: "llm" }]
                    }
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { hasEnoughCredits: boolean } }>();
            expect(body.data.hasEnoughCredits).toBe(false);
        });
    });
});
