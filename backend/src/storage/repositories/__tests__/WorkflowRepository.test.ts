/**
 * WorkflowRepository Tests
 *
 * Tests for workflow CRUD operations including JSON definition handling,
 * folder filtering, and pagination.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { WorkflowRepository } from "../WorkflowRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    mockCountResult,
    generateWorkflowRow,
    generateId
} from "./setup";

describe("WorkflowRepository", () => {
    let repository: WorkflowRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new WorkflowRepository();
    });

    describe("create", () => {
        it("should insert a new workflow and return the created record", async () => {
            const input = {
                name: "Test Workflow",
                description: "A test workflow",
                definition: { name: "Test Workflow", nodes: {}, edges: [], entryPoint: "start" },
                user_id: generateId(),
                workspace_id: generateId()
            };

            const mockRow = generateWorkflowRow({
                name: input.name,
                description: input.description,
                definition: JSON.stringify(input.definition),
                user_id: input.user_id,
                workspace_id: input.workspace_id
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO flowmaestro.workflows"),
                expect.arrayContaining([
                    input.name,
                    input.description,
                    JSON.stringify(input.definition),
                    input.user_id,
                    input.workspace_id
                ])
            );
            expect(result.name).toBe(input.name);
            expect(result.definition).toEqual(input.definition);
        });

        it("should handle null description", async () => {
            const input = {
                name: "Minimal Workflow",
                definition: { name: "Minimal Workflow", nodes: {}, edges: [], entryPoint: "start" },
                user_id: generateId(),
                workspace_id: generateId()
            };

            const mockRow = generateWorkflowRow({
                name: input.name,
                description: null,
                definition: JSON.stringify(input.definition)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.description).toBeNull();
        });

        it("should handle AI-generated workflows", async () => {
            const input = {
                name: "AI Workflow",
                definition: { name: "AI Workflow", nodes: {}, edges: [], entryPoint: "start" },
                user_id: generateId(),
                workspace_id: generateId(),
                ai_generated: true,
                ai_prompt: "Create a simple workflow"
            };

            const mockRow = generateWorkflowRow({
                ...input,
                definition: JSON.stringify(input.definition)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.create(input);

            expect(result.ai_generated).toBe(true);
            expect(result.ai_prompt).toBe("Create a simple workflow");
        });
    });

    describe("findById", () => {
        it("should return workflow when found", async () => {
            const workflowId = generateId();
            const mockRow = generateWorkflowRow({ id: workflowId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(workflowId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [workflowId]
            );
            expect(result?.id).toBe(workflowId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });

        it("should parse JSON definition from string", async () => {
            const workflowId = generateId();
            const definition = { nodes: { node1: { type: "trigger" } }, edges: [] };
            const mockRow = generateWorkflowRow({
                id: workflowId,
                definition: JSON.stringify(definition)
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(workflowId);

            expect(result?.definition).toEqual(definition);
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find workflow by id and workspace id", async () => {
            const workflowId = generateId();
            const workspaceId = generateId();
            const mockRow = generateWorkflowRow({ id: workflowId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(workflowId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL"
                ),
                [workflowId, workspaceId]
            );
            expect(result?.id).toBe(workflowId);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return paginated workflows with total count", async () => {
            const workspaceId = generateId();
            const mockRows1 = [generateWorkflowRow(), generateWorkflowRow()];

            mockQuery
                .mockResolvedValueOnce(mockCountResult(10)) // Count query
                .mockResolvedValueOnce(mockRows(mockRows1)); // Data query

            const result = await repository.findByWorkspaceId(workspaceId, {
                limit: 2,
                offset: 0
            });

            expect(result.total).toBe(10);
            expect(result.workflows).toHaveLength(2);
        });

        it("should apply folder filter when folderId is provided", async () => {
            const workspaceId = generateId();
            const folderId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(5))
                .mockResolvedValueOnce(mockRows([generateWorkflowRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId });

            // Both count and data queries should include folder filter
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("$2 = ANY(COALESCE(folder_ids"),
                expect.arrayContaining([workspaceId, folderId])
            );
        });

        it("should filter for root-level items when folderId is null", async () => {
            const workspaceId = generateId();

            mockQuery
                .mockResolvedValueOnce(mockCountResult(3))
                .mockResolvedValueOnce(mockRows([generateWorkflowRow()]));

            await repository.findByWorkspaceId(workspaceId, { folderId: null });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("folder_ids IS NULL OR folder_ids = ARRAY[]::UUID[]"),
                expect.arrayContaining([workspaceId])
            );
        });

        it("should use default pagination values", async () => {
            const workspaceId = generateId();

            mockQuery.mockResolvedValueOnce(mockCountResult(0)).mockResolvedValueOnce(mockRows([]));

            await repository.findByWorkspaceId(workspaceId);

            // Should use limit=50, offset=0 by default
            expect(mockQuery).toHaveBeenLastCalledWith(
                expect.stringContaining("LIMIT $2 OFFSET $3"),
                expect.arrayContaining([workspaceId, 50, 0])
            );
        });
    });

    describe("update", () => {
        it("should update specified fields only", async () => {
            const workflowId = generateId();
            const mockRow = generateWorkflowRow({ id: workflowId, name: "Updated Name" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(workflowId, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.workflows"),
                expect.arrayContaining(["Updated Name", workflowId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should stringify definition when updating", async () => {
            const workflowId = generateId();
            const newDefinition = { name: "Updated", nodes: {}, edges: [], entryPoint: "start" };
            const mockRow = generateWorkflowRow({
                id: workflowId,
                definition: JSON.stringify(newDefinition)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(workflowId, { definition: newDefinition });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("definition = $1"),
                expect.arrayContaining([JSON.stringify(newDefinition), workflowId])
            );
            expect(result?.definition).toEqual(newDefinition);
        });

        it("should return existing workflow when no updates provided", async () => {
            const workflowId = generateId();
            const mockRow = generateWorkflowRow({ id: workflowId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(workflowId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.workflows"),
                [workflowId]
            );
            expect(result?.id).toBe(workflowId);
        });

        it("should update version field", async () => {
            const workflowId = generateId();
            const mockRow = generateWorkflowRow({ id: workflowId, version: 2 });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(workflowId, { version: 2 });

            expect(result?.version).toBe(2);
        });
    });

    describe("updateSnapshot", () => {
        it("should update workflow definition and timestamp", async () => {
            const workflowId = generateId();
            const newDefinition = { nodes: { new: true }, edges: [] };
            const mockRow = generateWorkflowRow({
                id: workflowId,
                definition: JSON.stringify(newDefinition)
            });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateSnapshot(workflowId, newDefinition as never);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET definition = $2, updated_at = NOW()"),
                [workflowId, JSON.stringify(newDefinition)]
            );
            expect(result.definition).toEqual(newDefinition);
        });
    });

    describe("delete", () => {
        it("should soft delete workflow and return true", async () => {
            const workflowId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(workflowId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SET deleted_at = CURRENT_TIMESTAMP"),
                [workflowId]
            );
            expect(result).toBe(true);
        });

        it("should return false when workflow not found", async () => {
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.delete("non-existent");

            expect(result).toBe(false);
        });
    });

    describe("hardDelete", () => {
        it("should permanently delete workflow", async () => {
            const workflowId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.hardDelete(workflowId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM flowmaestro.workflows"),
                [workflowId]
            );
            expect(result).toBe(true);
        });
    });

    describe("row mapping", () => {
        it("should correctly map date fields", async () => {
            const workflowId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateWorkflowRow({
                id: workflowId,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(workflowId);

            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.deleted_at).toBeNull();
        });

        it("should handle definition as object (already parsed by pg)", async () => {
            const workflowId = generateId();
            const definition = { nodes: {}, edges: [] };
            const mockRow = {
                ...generateWorkflowRow({ id: workflowId }),
                definition // Already an object, not a string
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(workflowId);

            expect(result?.definition).toEqual(definition);
        });
    });
});
