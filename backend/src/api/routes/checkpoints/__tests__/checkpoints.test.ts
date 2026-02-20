/**
 * Checkpoint Routes Integration Tests
 *
 * Tests for workflow checkpoint management endpoints:
 * - POST /checkpoints/:id - Create checkpoint from workflow
 * - GET /checkpoints/workflow/:workflowId - List checkpoints for workflow
 * - GET /checkpoints/:id - Get checkpoint by ID
 * - POST /checkpoints/rename/:id - Rename checkpoint
 * - DELETE /checkpoints/:id - Delete checkpoint
 * - POST /checkpoints/restore/:id - Restore workflow to checkpoint state
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    createTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    TestUser
} from "../../../../../__tests__/helpers/fastify-test-client";
import { NotFoundError, ForbiddenError } from "../../../middleware/error-handler";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock CheckpointsRepository
const mockCheckpointsRepo = {
    create: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    rename: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/CheckpointsRepository", () => ({
    CheckpointsRepository: jest.fn().mockImplementation(() => mockCheckpointsRepo)
}));

// Mock WorkflowRepository (used in restore endpoint)
const mockWorkflowRepo = {
    findById: jest.fn(),
    updateSnapshot: jest.fn()
};

jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

// ============================================================================
// TEST HELPERS
// ============================================================================

interface MockCheckpoint {
    id: string;
    workflow_id: string;
    created_by: string;
    name: string | null;
    description: string | null;
    snapshot: Record<string, unknown>;
    created_at: Date;
}

interface MockWorkflow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    definition: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}

function createMockCheckpoint(overrides: Partial<MockCheckpoint> = {}): MockCheckpoint {
    return {
        id: overrides.id || uuidv4(),
        workflow_id: overrides.workflow_id || uuidv4(),
        created_by: overrides.created_by || uuidv4(),
        name: overrides.name ?? "Test Checkpoint",
        description: overrides.description ?? "Test checkpoint description",
        snapshot: overrides.snapshot || {
            nodes: {},
            edges: [],
            entryPoint: "input"
        },
        created_at: overrides.created_at || new Date()
    };
}

function createMockWorkflow(overrides: Partial<MockWorkflow> = {}): MockWorkflow {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || "test-workspace-id",
        name: overrides.name || "Test Workflow",
        definition: overrides.definition || {
            nodes: {},
            edges: [],
            entryPoint: "input"
        },
        created_at: overrides.created_at || new Date(),
        updated_at: overrides.updated_at || new Date()
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Checkpoint Routes", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;

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
    // POST /checkpoints/:id - Create Checkpoint
    // =========================================================================
    describe("POST /checkpoints/:id", () => {
        it("should create a checkpoint with name and description", async () => {
            const workflowId = uuidv4();
            const mockCheckpoint = createMockCheckpoint({
                workflow_id: workflowId,
                created_by: testUser.id,
                name: "My Checkpoint",
                description: "Saved state"
            });
            mockCheckpointsRepo.create.mockResolvedValueOnce(mockCheckpoint);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/${workflowId}`,
                payload: {
                    name: "My Checkpoint",
                    description: "Saved state"
                }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: MockCheckpoint }>();
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("My Checkpoint");
            expect(body.data.description).toBe("Saved state");
            expect(mockCheckpointsRepo.create).toHaveBeenCalledWith(
                workflowId,
                testUser.id,
                "My Checkpoint",
                "Saved state"
            );
        });

        it("should create a checkpoint without name (optional)", async () => {
            const workflowId = uuidv4();
            const mockCheckpoint = createMockCheckpoint({
                workflow_id: workflowId,
                name: null
            });
            mockCheckpointsRepo.create.mockResolvedValueOnce(mockCheckpoint);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/${workflowId}`,
                payload: {}
            });

            expect(response.statusCode).toBe(201);
            expect(mockCheckpointsRepo.create).toHaveBeenCalledWith(
                workflowId,
                testUser.id,
                undefined,
                undefined
            );
        });

        it("should return 400 for invalid workflow ID format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/checkpoints/not-a-uuid",
                payload: { name: "Test" }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for name exceeding max length", async () => {
            const workflowId = uuidv4();
            const longName = "a".repeat(256);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/${workflowId}`,
                payload: { name: longName }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for description exceeding max length", async () => {
            const workflowId = uuidv4();
            const longDescription = "a".repeat(1001);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/${workflowId}`,
                payload: { description: longDescription }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when workflow not found", async () => {
            const workflowId = uuidv4();
            mockCheckpointsRepo.create.mockRejectedValueOnce(
                new NotFoundError("Workflow not found")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/${workflowId}`,
                payload: { name: "Test" }
            });

            expect(response.statusCode).toBe(404);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toBe("Workflow not found");
        });

        it("should return 403 when user doesn't own workflow", async () => {
            const workflowId = uuidv4();
            mockCheckpointsRepo.create.mockRejectedValueOnce(
                new ForbiddenError("Access denied to this workflow")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/${workflowId}`,
                payload: { name: "Test" }
            });

            expect(response.statusCode).toBe(403);
        });

        it("should return 401 for unauthenticated request", async () => {
            const workflowId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/checkpoints/${workflowId}`,
                payload: { name: "Test" }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /checkpoints/workflow/:workflowId - List Checkpoints
    // =========================================================================
    describe("GET /checkpoints/workflow/:workflowId", () => {
        it("should list checkpoints for a workflow", async () => {
            const workflowId = uuidv4();
            const checkpoints = [
                createMockCheckpoint({ workflow_id: workflowId, name: "Checkpoint 1" }),
                createMockCheckpoint({ workflow_id: workflowId, name: "Checkpoint 2" })
            ];
            mockCheckpointsRepo.list.mockResolvedValueOnce(checkpoints);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/workflow/${workflowId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: MockCheckpoint[] }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
            expect(mockCheckpointsRepo.list).toHaveBeenCalledWith(workflowId, testUser.id);
        });

        it("should return empty array when no checkpoints exist", async () => {
            const workflowId = uuidv4();
            mockCheckpointsRepo.list.mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/workflow/${workflowId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: MockCheckpoint[] }>();
            expect(body.data).toEqual([]);
        });

        it("should return 400 for invalid workflow ID format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/checkpoints/workflow/not-a-uuid"
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when workflow not found", async () => {
            const workflowId = uuidv4();
            mockCheckpointsRepo.list.mockRejectedValueOnce(new NotFoundError("Workflow not found"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/workflow/${workflowId}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 when user doesn't own workflow", async () => {
            const workflowId = uuidv4();
            mockCheckpointsRepo.list.mockRejectedValueOnce(
                new ForbiddenError("Access denied to this workflow")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/workflow/${workflowId}`
            });

            expect(response.statusCode).toBe(403);
        });

        it("should return 401 for unauthenticated request", async () => {
            const workflowId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/checkpoints/workflow/${workflowId}`
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /checkpoints/:id - Get Checkpoint
    // =========================================================================
    describe("GET /checkpoints/:id", () => {
        it("should get a checkpoint by ID", async () => {
            const checkpointId = uuidv4();
            const mockCheckpoint = createMockCheckpoint({ id: checkpointId });
            mockCheckpointsRepo.get.mockResolvedValueOnce(mockCheckpoint);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: MockCheckpoint }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(checkpointId);
            expect(mockCheckpointsRepo.get).toHaveBeenCalledWith(checkpointId, testUser.id);
        });

        it("should return checkpoint with snapshot data", async () => {
            const checkpointId = uuidv4();
            const snapshot = {
                nodes: { input: { type: "input" } },
                edges: [{ id: "e1", source: "input", target: "output" }],
                entryPoint: "input"
            };
            const mockCheckpoint = createMockCheckpoint({
                id: checkpointId,
                snapshot
            });
            mockCheckpointsRepo.get.mockResolvedValueOnce(mockCheckpoint);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: MockCheckpoint }>();
            expect(body.data.snapshot).toEqual(snapshot);
        });

        it("should return 400 for invalid checkpoint ID format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/checkpoints/not-a-uuid"
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when checkpoint not found", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.get.mockRejectedValueOnce(
                new NotFoundError("Checkpoint not found")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 when user doesn't own associated workflow", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.get.mockRejectedValueOnce(
                new ForbiddenError("Access denied to this workflow")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(403);
        });

        it("should return 401 for unauthenticated request", async () => {
            const checkpointId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // POST /checkpoints/rename/:id - Rename Checkpoint
    // =========================================================================
    describe("POST /checkpoints/rename/:id", () => {
        it("should rename a checkpoint", async () => {
            const checkpointId = uuidv4();
            const updatedCheckpoint = createMockCheckpoint({
                id: checkpointId,
                name: "New Name"
            });
            mockCheckpointsRepo.rename.mockResolvedValueOnce(updatedCheckpoint);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/rename/${checkpointId}`,
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: MockCheckpoint }>();
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("New Name");
            expect(mockCheckpointsRepo.rename).toHaveBeenCalledWith(
                checkpointId,
                testUser.id,
                "New Name"
            );
        });

        it("should return 400 for missing name", async () => {
            const checkpointId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/rename/${checkpointId}`,
                payload: {}
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for empty name", async () => {
            const checkpointId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/rename/${checkpointId}`,
                payload: { name: "" }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for name exceeding max length", async () => {
            const checkpointId = uuidv4();
            const longName = "a".repeat(256);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/rename/${checkpointId}`,
                payload: { name: longName }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for invalid checkpoint ID format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/checkpoints/rename/not-a-uuid",
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when checkpoint not found", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.rename.mockRejectedValueOnce(
                new NotFoundError("Checkpoint not found")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/rename/${checkpointId}`,
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 when user doesn't own associated workflow", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.rename.mockRejectedValueOnce(
                new ForbiddenError("Access denied to this workflow")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/rename/${checkpointId}`,
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(403);
        });

        it("should return 401 for unauthenticated request", async () => {
            const checkpointId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/checkpoints/rename/${checkpointId}`,
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // DELETE /checkpoints/:id - Delete Checkpoint
    // =========================================================================
    describe("DELETE /checkpoints/:id", () => {
        it("should delete a checkpoint", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.delete.mockResolvedValueOnce(undefined);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(204);
            expect(mockCheckpointsRepo.delete).toHaveBeenCalledWith(checkpointId, testUser.id);
        });

        it("should return 400 for invalid checkpoint ID format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/checkpoints/not-a-uuid"
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when checkpoint not found", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.delete.mockRejectedValueOnce(
                new NotFoundError("Checkpoint not found")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 when user doesn't own associated workflow", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.delete.mockRejectedValueOnce(
                new ForbiddenError("Access denied to this workflow")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(403);
        });

        it("should return 401 for unauthenticated request", async () => {
            const checkpointId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "DELETE",
                url: `/checkpoints/${checkpointId}`
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // POST /checkpoints/restore/:id - Restore Checkpoint
    // =========================================================================
    describe("POST /checkpoints/restore/:id", () => {
        it("should restore workflow to checkpoint state", async () => {
            const checkpointId = uuidv4();
            const workflowId = uuidv4();
            const snapshot = {
                nodes: { input: { type: "input" } },
                edges: [],
                entryPoint: "input"
            };
            const mockCheckpoint = createMockCheckpoint({
                id: checkpointId,
                workflow_id: workflowId,
                snapshot
            });
            const updatedWorkflow = createMockWorkflow({
                id: workflowId,
                definition: snapshot
            });

            mockCheckpointsRepo.get.mockResolvedValueOnce(mockCheckpoint);
            mockWorkflowRepo.updateSnapshot.mockResolvedValueOnce(updatedWorkflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/restore/${checkpointId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: MockWorkflow }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(workflowId);
            expect(mockCheckpointsRepo.get).toHaveBeenCalledWith(checkpointId, testUser.id);
            expect(mockWorkflowRepo.updateSnapshot).toHaveBeenCalledWith(workflowId, snapshot);
        });

        it("should return 400 for invalid checkpoint ID format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/checkpoints/restore/not-a-uuid"
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when checkpoint not found", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.get.mockRejectedValueOnce(
                new NotFoundError("Checkpoint not found")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/restore/${checkpointId}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 when user doesn't own associated workflow", async () => {
            const checkpointId = uuidv4();
            mockCheckpointsRepo.get.mockRejectedValueOnce(
                new ForbiddenError("Access denied to this workflow")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/restore/${checkpointId}`
            });

            expect(response.statusCode).toBe(403);
        });

        it("should return 500 when workflow update fails", async () => {
            const checkpointId = uuidv4();
            const workflowId = uuidv4();
            const mockCheckpoint = createMockCheckpoint({
                id: checkpointId,
                workflow_id: workflowId
            });

            mockCheckpointsRepo.get.mockResolvedValueOnce(mockCheckpoint);
            mockWorkflowRepo.updateSnapshot.mockRejectedValueOnce(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/checkpoints/restore/${checkpointId}`
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 401 for unauthenticated request", async () => {
            const checkpointId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/checkpoints/restore/${checkpointId}`
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // Authentication Required (parameterized tests)
    // =========================================================================
    describe("Authentication required for all endpoints", () => {
        const checkpointId = uuidv4();
        const workflowId = uuidv4();

        const endpoints = [
            { method: "POST" as const, url: `/checkpoints/${workflowId}`, payload: {} },
            { method: "GET" as const, url: `/checkpoints/workflow/${workflowId}` },
            { method: "GET" as const, url: `/checkpoints/${checkpointId}` },
            {
                method: "POST" as const,
                url: `/checkpoints/rename/${checkpointId}`,
                payload: { name: "Test" }
            },
            { method: "DELETE" as const, url: `/checkpoints/${checkpointId}` },
            { method: "POST" as const, url: `/checkpoints/restore/${checkpointId}` }
        ];

        it.each(endpoints)(
            "$method $url should return 401 without authentication",
            async ({ method, url, payload }) => {
                const response = await unauthenticatedRequest(fastify, {
                    method,
                    url,
                    payload
                });

                expect(response.statusCode).toBe(401);
            }
        );
    });
});
