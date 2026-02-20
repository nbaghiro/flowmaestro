/**
 * Workspace Credits Tests
 *
 * Tests for workspace credit management: balance, transactions, and estimate.
 */

import { FastifyInstance } from "fastify";
import { creditService } from "../../../../services/workspace";
import {
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
    WorkspaceInvitationRepository: jest.fn().mockImplementation(() => ({}))
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

describe("Workspace Credits", () => {
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
    // GET /workspaces/:workspaceId/credits/balance - Get Credits Balance
    // =========================================================================
    describe("GET /workspaces/:workspaceId/credits/balance", () => {
        it("should return credit balance", async () => {
            (creditService.getBalance as jest.Mock).mockResolvedValueOnce({
                subscription: 1000,
                purchased: 500,
                bonus: 100,
                available: 1600
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/credits/balance`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { available: number } }>();
            expect(body.data.available).toBe(1600);
        });

        it("should return 404 when credits not found", async () => {
            (creditService.getBalance as jest.Mock).mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/credits/balance`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
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
            (creditService.getTransactions as jest.Mock).mockResolvedValueOnce(transactions);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/credits/transactions`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(2);
        });

        it("should support pagination", async () => {
            (creditService.getTransactions as jest.Mock).mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/credits/transactions?limit=10&offset=5`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID
            });

            expect(response.statusCode).toBe(200);
            expect(creditService.getTransactions).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ limit: 10 })
            );
        });
    });

    // =========================================================================
    // POST /workspaces/:workspaceId/credits/estimate - Estimate Credits
    // =========================================================================
    describe("POST /workspaces/:workspaceId/credits/estimate", () => {
        it("should estimate credits for workflow", async () => {
            (creditService.estimateWorkflowCredits as jest.Mock).mockResolvedValueOnce({
                totalCredits: 50,
                breakdown: []
            });
            (creditService.getBalance as jest.Mock).mockResolvedValueOnce({ available: 1000 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/credits/estimate`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
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
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/credits/estimate`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
                payload: {
                    workflowDefinition: {}
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("nodes array");
        });

        it("should indicate insufficient credits", async () => {
            (creditService.estimateWorkflowCredits as jest.Mock).mockResolvedValueOnce({
                totalCredits: 500,
                breakdown: []
            });
            (creditService.getBalance as jest.Mock).mockResolvedValueOnce({ available: 100 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/workspaces/${DEFAULT_TEST_WORKSPACE_ID}/credits/estimate`,
                workspaceId: DEFAULT_TEST_WORKSPACE_ID,
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
