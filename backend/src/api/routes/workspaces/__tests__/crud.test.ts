/**
 * Workspace CRUD Operations Tests
 *
 * Tests for workspace create, list, get, update, delete, and upgrade operations.
 */

import { FastifyInstance } from "fastify";
import { workspaceService } from "../../../../services/workspace";
import { WorkspaceCreditRepository } from "../../../../storage/repositories/WorkspaceCreditRepository";
import {
    mockWorkspaceRepoInstance,
    createMockWorkspace,
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
    WorkspaceInvitationRepository: jest.fn().mockImplementation(() => ({}))
}));

jest.mock("../../../../storage/repositories/WorkspaceCreditRepository", () => ({
    WorkspaceCreditRepository: jest.fn().mockImplementation(() => ({
        getBalance: jest.fn(),
        addBonusCredits: jest.fn(),
        createTransaction: jest.fn()
    }))
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

describe("Workspace CRUD Operations", () => {
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
    // POST /workspaces - Create Workspace
    // =========================================================================
    describe("POST /workspaces", () => {
        it("should create a workspace", async () => {
            mockWorkspaceRepoInstance.isNameAvailableForOwner.mockResolvedValueOnce(true);
            (workspaceService.createWorkspace as jest.Mock).mockResolvedValueOnce(mockWorkspace);

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
            expect(body.data.id).toBe(DEFAULT_TEST_WORKSPACE_ID);
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
            (workspaceService.getWorkspacesForUser as jest.Mock).mockResolvedValueOnce(workspaces);

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
            (workspaceService.getWorkspacesForUser as jest.Mock).mockResolvedValueOnce([]);

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
            (workspaceService.getWorkspaceWithStats as jest.Mock).mockResolvedValueOnce(
                mockWorkspace
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { workspace: { id: string } } }>();
            expect(body.success).toBe(true);
            expect(body.data.workspace.id).toBe(DEFAULT_TEST_WORKSPACE_ID);
        });

        it("should return 404 for non-existent workspace", async () => {
            (workspaceService.getWorkspaceWithStats as jest.Mock).mockResolvedValueOnce(null);

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
            (workspaceService.updateWorkspace as jest.Mock).mockResolvedValueOnce(updated);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
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
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
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
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
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
            (workspaceService.updateWorkspace as jest.Mock).mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
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
            (workspaceService.deleteWorkspace as jest.Mock).mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
            expect(body.message).toContain("deleted");
        });

        it("should return 404 when workspace not found", async () => {
            (workspaceService.deleteWorkspace as jest.Mock).mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // POST /workspaces/:workspaceId/upgrade - Upgrade Workspace
    // =========================================================================
    describe("POST /workspaces/:workspaceId/upgrade", () => {
        let mockCreditRepoInstance: {
            getBalance: jest.Mock;
            addBonusCredits: jest.Mock;
            createTransaction: jest.Mock;
        };

        beforeEach(() => {
            mockCreditRepoInstance = {
                getBalance: jest.fn(),
                addBonusCredits: jest.fn(),
                createTransaction: jest.fn()
            };
            (WorkspaceCreditRepository as jest.Mock).mockImplementation(
                () => mockCreditRepoInstance
            );
        });

        it("should upgrade workspace to pro plan", async () => {
            mockWorkspaceRepoInstance.findById.mockResolvedValueOnce({
                ...mockWorkspace,
                type: "free"
            });
            const upgradedWorkspace = { ...mockWorkspace, type: "pro" };
            mockWorkspaceRepoInstance.update.mockResolvedValueOnce(upgradedWorkspace);
            mockCreditRepoInstance.getBalance.mockResolvedValueOnce({
                subscription: 0,
                purchased: 0,
                bonus: 0
            });
            mockCreditRepoInstance.addBonusCredits.mockResolvedValueOnce(undefined);
            mockCreditRepoInstance.createTransaction.mockResolvedValueOnce(undefined);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/upgrade`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
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
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/upgrade`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    plan: "invalid"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Invalid plan");
        });

        it("should return 400 when already on requested plan", async () => {
            const proWorkspace = { ...mockWorkspace, type: "pro" };
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(proWorkspace)
                .mockResolvedValueOnce(proWorkspace);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/upgrade`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    plan: "pro"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already on the pro plan");
        });

        it("should return 404 when workspace not found", async () => {
            mockWorkspaceRepoInstance.findById
                .mockResolvedValueOnce(mockWorkspace)
                .mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/upgrade`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    plan: "pro"
                }
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
