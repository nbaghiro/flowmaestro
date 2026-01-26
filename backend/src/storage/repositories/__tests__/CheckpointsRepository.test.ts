/**
 * CheckpointsRepository Tests
 *
 * Tests for workflow checkpoint operations including creation with compression,
 * listing, retrieval, deletion, and auto-pruning of old checkpoints.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

// Mock the WorkflowRepository
const mockWorkflowFindById = jest.fn();
jest.mock("../WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => ({
        findById: mockWorkflowFindById
    }))
}));

import { CheckpointsRepository } from "../CheckpointsRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateCheckpointRow,
    generateWorkflowRow,
    generateId
} from "./setup";

describe("CheckpointsRepository", () => {
    let repository: CheckpointsRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new CheckpointsRepository();
    });

    describe("create", () => {
        it("should create a checkpoint with compressed snapshot", async () => {
            const workflowId = generateId();
            const userId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId,
                definition: JSON.stringify({ nodes: { start: {} }, edges: [] })
            });

            const mockCheckpoint = generateCheckpointRow({
                workflow_id: workflowId,
                created_by: userId,
                name: "My Checkpoint"
            });

            // Mock workflow lookup
            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });

            // Mock checkpoint insert
            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockCheckpoint]));

            // Mock prune query
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.create(workflowId, userId, "My Checkpoint");

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workflow_checkpoints"),
                expect.arrayContaining([workflowId, userId, "My Checkpoint"])
            );
            expect(result.workflow_id).toBe(workflowId);
            expect(result.name).toBe("My Checkpoint");
        });

        it("should throw NotFoundError when workflow not found", async () => {
            mockWorkflowFindById.mockResolvedValueOnce(null);

            await expect(repository.create(generateId(), generateId())).rejects.toThrow(
                "Workflow not found"
            );
        });

        it("should throw ForbiddenError when user does not own workflow", async () => {
            const workflowId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: generateId() // Different user
            });

            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });

            await expect(repository.create(workflowId, generateId())).rejects.toThrow(
                "Access denied to this workflow"
            );
        });

        it("should auto-prune old checkpoints beyond limit", async () => {
            const workflowId = generateId();
            const userId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId
            });

            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });
            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([generateCheckpointRow({ workflow_id: workflowId })])
            );
            mockQuery.mockResolvedValueOnce(mockAffectedRows(5)); // Pruned 5 old checkpoints

            await repository.create(workflowId, userId);

            expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining("OFFSET $2"), [
                workflowId,
                50
            ]);
        });
    });

    describe("delete", () => {
        it("should soft delete checkpoint", async () => {
            const checkpointId = generateId();
            const workflowId = generateId();
            const userId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId
            });

            // Mock checkpoint lookup
            mockQuery.mockResolvedValueOnce(mockRows([{ workflow_id: workflowId }]));

            // Mock workflow lookup
            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });

            // Mock delete
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            await repository.delete(checkpointId, userId);

            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("SET deleted_at = NOW()"),
                [checkpointId]
            );
        });

        it("should throw NotFoundError when checkpoint not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            await expect(repository.delete(generateId(), generateId())).rejects.toThrow(
                "Checkpoint not found"
            );
        });

        it("should throw ForbiddenError when user does not own workflow", async () => {
            const checkpointId = generateId();
            const workflowId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: generateId() // Different user
            });

            mockQuery.mockResolvedValueOnce(mockRows([{ workflow_id: workflowId }]));
            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });

            await expect(repository.delete(checkpointId, generateId())).rejects.toThrow(
                "Access denied to this workflow"
            );
        });
    });

    describe("list", () => {
        it("should return checkpoints for workflow", async () => {
            const workflowId = generateId();
            const userId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId
            });

            const mockCheckpoints = [
                generateCheckpointRow({ workflow_id: workflowId, name: "Checkpoint 1" }),
                generateCheckpointRow({ workflow_id: workflowId, name: "Checkpoint 2" })
            ];

            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });
            mockQuery.mockResolvedValueOnce(mockRows(mockCheckpoints));

            const result = await repository.list(workflowId, userId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workflow_id = $1"),
                [workflowId]
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND deleted_at IS NULL"),
                expect.anything()
            );
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY created_at DESC"),
                expect.anything()
            );
            expect(result).toHaveLength(2);
        });

        it("should throw NotFoundError when workflow not found", async () => {
            mockWorkflowFindById.mockResolvedValueOnce(null);

            await expect(repository.list(generateId(), generateId())).rejects.toThrow(
                "Workflow not found"
            );
        });
    });

    describe("get", () => {
        it("should return checkpoint by id", async () => {
            const checkpointId = generateId();
            const workflowId = generateId();
            const userId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId
            });
            const mockCheckpoint = generateCheckpointRow({
                id: checkpointId,
                workflow_id: workflowId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockCheckpoint]));
            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });

            const result = await repository.get(checkpointId, userId);

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [
                checkpointId
            ]);
            expect(result.id).toBe(checkpointId);
        });

        it("should throw NotFoundError when checkpoint not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            await expect(repository.get(generateId(), generateId())).rejects.toThrow(
                "Checkpoint not found"
            );
        });
    });

    describe("rename", () => {
        it("should update checkpoint name", async () => {
            const checkpointId = generateId();
            const workflowId = generateId();
            const userId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId
            });
            const updatedCheckpoint = generateCheckpointRow({
                id: checkpointId,
                workflow_id: workflowId,
                name: "Renamed Checkpoint"
            });

            mockQuery.mockResolvedValueOnce(mockRows([{ workflow_id: workflowId }]));
            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });
            mockQuery.mockResolvedValueOnce(mockInsertReturning([updatedCheckpoint]));

            const result = await repository.rename(checkpointId, userId, "Renamed Checkpoint");

            expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining("SET name = $2"), [
                checkpointId,
                "Renamed Checkpoint"
            ]);
            expect(result.name).toBe("Renamed Checkpoint");
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const workflowId = generateId();
            const userId = generateId();
            const now = new Date().toISOString();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId
            });
            const mockCheckpoint = generateCheckpointRow({
                workflow_id: workflowId,
                created_at: now
            });

            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });
            mockQuery.mockResolvedValueOnce(mockRows([mockCheckpoint]));

            const result = await repository.list(workflowId, userId);

            expect(result[0].created_at).toBeInstanceOf(Date);
        });

        it("should decompress snapshot", async () => {
            const checkpointId = generateId();
            const workflowId = generateId();
            const userId = generateId();
            const workflow = generateWorkflowRow({
                id: workflowId,
                user_id: userId
            });
            const mockCheckpoint = generateCheckpointRow({
                id: checkpointId,
                workflow_id: workflowId,
                snapshot: JSON.stringify({ nodes: { testNode: {} }, edges: [] })
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockCheckpoint]));
            mockWorkflowFindById.mockResolvedValueOnce({
                ...workflow,
                definition: JSON.parse(workflow.definition)
            });

            const result = await repository.get(checkpointId, userId);

            expect(result.snapshot).toHaveProperty("nodes");
            expect(result.snapshot).toHaveProperty("edges");
        });
    });
});
