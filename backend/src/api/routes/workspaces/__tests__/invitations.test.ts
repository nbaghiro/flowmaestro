/**
 * Workspace Invitations Tests
 *
 * Tests for workspace invitation management: list, revoke, get (public), accept, decline.
 */

import { FastifyInstance } from "fastify";
import {
    mockInvitationRepo,
    mockMemberRepoInstance,
    resetAllMocks,
    createWorkspaceTestServer,
    closeWorkspaceTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
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
    UserRepository: jest.fn().mockImplementation(() => ({}))
}));

jest.mock("../../../../services/email/EmailService", () => ({
    emailService: {
        sendWorkspaceInvitation: jest.fn().mockResolvedValue(undefined)
    }
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Workspace Invitations", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;

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
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/invitations`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
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
            mockInvitationRepo.findByWorkspaceId.mockResolvedValueOnce({
                invitations,
                total: invitations.length
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/invitations?status=all`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(2);
        });
    });

    // =========================================================================
    // DELETE /workspaces/:workspaceId/invitations/:invitationId - Revoke
    // =========================================================================
    describe("DELETE /workspaces/:workspaceId/invitations/:invitationId", () => {
        it("should revoke pending invitation", async () => {
            mockInvitationRepo.findById.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                status: "pending"
            });
            mockInvitationRepo.delete.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/invitations/inv-1`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.message).toContain("revoked");
        });

        it("should return 404 when invitation not found", async () => {
            mockInvitationRepo.findById.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/invitations/non-existent`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 when invitation not pending", async () => {
            mockInvitationRepo.findById.mockResolvedValueOnce({
                id: "inv-1",
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                status: "accepted"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/invitations/inv-1`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
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
                workspace: { id: DEFAULT_TEST_WORKSPACE_ID, name: "Test Workspace" },
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
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
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
            expect(body.data.workspaceId).toBe(DEFAULT_TEST_WORKSPACE_ID);
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
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
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
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
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
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
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
});
