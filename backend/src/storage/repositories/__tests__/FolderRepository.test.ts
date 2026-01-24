/**
 * FolderRepository Tests
 *
 * Tests for folder CRUD operations including hierarchical structure,
 * item counts, and tree building.
 */

// Mock the database module before importing the repository
const mockQuery = jest.fn();
jest.mock("../../database", () => ({
    db: { query: mockQuery }
}));

import { FolderRepository } from "../FolderRepository";
import {
    mockRows,
    mockInsertReturning,
    mockEmptyResult,
    mockAffectedRows,
    generateFolderRow,
    generateId
} from "./setup";

describe("FolderRepository", () => {
    let repository: FolderRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new FolderRepository();
    });

    describe("create", () => {
        it("should insert a new root folder", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "My Folder"
            };

            // First call: get next position
            mockQuery.mockResolvedValueOnce(mockRows([{ max_position: 2 }]));
            // Second call: insert
            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([
                    generateFolderRow({
                        ...input,
                        position: 3
                    })
                ])
            );

            const result = await repository.create(input);

            expect(result.name).toBe(input.name);
            expect(result.position).toBe(3);
            expect(result.parent_id).toBeNull();
        });

        it("should create nested folder under parent", async () => {
            const parentId = generateId();
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Child Folder",
                parent_id: parentId
            };

            // First call: find parent
            mockQuery.mockResolvedValueOnce(
                mockRows([generateFolderRow({ id: parentId, depth: 1 })])
            );
            // Second call: get next position
            mockQuery.mockResolvedValueOnce(mockRows([{ max_position: 0 }]));
            // Third call: insert
            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([
                    generateFolderRow({
                        ...input,
                        position: 1,
                        depth: 2
                    })
                ])
            );

            const result = await repository.create(input);

            expect(result.name).toBe(input.name);
            expect(result.parent_id).toBe(parentId);
        });

        it("should throw error when parent not found", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Child Folder",
                parent_id: generateId()
            };

            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            await expect(repository.create(input)).rejects.toThrow("Parent folder not found");
        });

        it("should throw error when max depth exceeded", async () => {
            const parentId = generateId();
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Deep Folder",
                parent_id: parentId
            };

            // Parent at max depth (depth 4, MAX_FOLDER_DEPTH is 5)
            mockQuery.mockResolvedValueOnce(
                mockRows([generateFolderRow({ id: parentId, depth: 4 })])
            );

            await expect(repository.create(input)).rejects.toThrow("Maximum folder nesting depth");
        });

        it("should apply default color when not specified", async () => {
            const input = {
                user_id: generateId(),
                workspace_id: generateId(),
                name: "Colorless Folder"
            };

            mockQuery.mockResolvedValueOnce(mockRows([{ max_position: null }]));
            mockQuery.mockResolvedValueOnce(
                mockInsertReturning([
                    generateFolderRow({
                        ...input,
                        color: "#6366f1"
                    })
                ])
            );

            const result = await repository.create(input);

            expect(result.color).toBe("#6366f1");
        });
    });

    describe("findById", () => {
        it("should return folder when found", async () => {
            const folderId = generateId();
            const mockRow = generateFolderRow({ id: folderId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(folderId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1 AND deleted_at IS NULL"),
                [folderId]
            );
            expect(result?.id).toBe(folderId);
        });

        it("should return null when not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.findById("non-existent");

            expect(result).toBeNull();
        });
    });

    describe("findByIdAndWorkspaceId", () => {
        it("should find folder by id and workspace id", async () => {
            const folderId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFolderRow({ id: folderId, workspace_id: workspaceId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByIdAndWorkspaceId(folderId, workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining(
                    "WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL"
                ),
                [folderId, workspaceId]
            );
            expect(result?.id).toBe(folderId);
        });
    });

    describe("findByWorkspaceId", () => {
        it("should return all folders for workspace", async () => {
            const workspaceId = generateId();
            const mockFolders = [generateFolderRow(), generateFolderRow()];

            mockQuery.mockResolvedValueOnce(mockRows(mockFolders));

            const result = await repository.findByWorkspaceId(workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("WHERE workspace_id = $1 AND deleted_at IS NULL"),
                [workspaceId]
            );
            expect(result).toHaveLength(2);
        });
    });

    describe("findByWorkspaceIdWithCounts", () => {
        it("should return folders with item counts", async () => {
            const workspaceId = generateId();
            const mockRow = {
                ...generateFolderRow({ workspace_id: workspaceId }),
                workflow_count: "5",
                agent_count: "3",
                form_interface_count: "2",
                chat_interface_count: "1",
                knowledge_base_count: "4"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findByWorkspaceIdWithCounts(workspaceId);

            expect(result).toHaveLength(1);
            expect(result[0].itemCounts.workflows).toBe(5);
            expect(result[0].itemCounts.agents).toBe(3);
            expect(result[0].itemCounts.formInterfaces).toBe(2);
            expect(result[0].itemCounts.chatInterfaces).toBe(1);
            expect(result[0].itemCounts.knowledgeBases).toBe(4);
            expect(result[0].itemCounts.total).toBe(15);
        });
    });

    describe("getItemCounts", () => {
        it("should return item counts for folder", async () => {
            const folderId = generateId();
            const mockRow = {
                workflow_count: "10",
                agent_count: "5",
                form_interface_count: "3",
                chat_interface_count: "2",
                knowledge_base_count: "1"
            };

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.getItemCounts(folderId);

            expect(result.workflows).toBe(10);
            expect(result.agents).toBe(5);
            expect(result.formInterfaces).toBe(3);
            expect(result.chatInterfaces).toBe(2);
            expect(result.knowledgeBases).toBe(1);
            expect(result.total).toBe(21);
        });
    });

    describe("update", () => {
        it("should update specified fields", async () => {
            const folderId = generateId();
            const userId = generateId();
            const mockRow = generateFolderRow({ id: folderId, name: "Updated Name" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.update(folderId, userId, { name: "Updated Name" });

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE flowmaestro.folders"),
                expect.arrayContaining(["Updated Name", folderId, userId])
            );
            expect(result?.name).toBe("Updated Name");
        });

        it("should return existing folder when no updates provided", async () => {
            const folderId = generateId();
            const userId = generateId();
            const mockRow = generateFolderRow({ id: folderId, user_id: userId });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.update(folderId, userId, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("SELECT * FROM flowmaestro.folders"),
                [folderId, userId]
            );
            expect(result?.id).toBe(folderId);
        });
    });

    describe("updateInWorkspace", () => {
        it("should update folder by workspace id", async () => {
            const folderId = generateId();
            const workspaceId = generateId();
            const mockRow = generateFolderRow({ id: folderId, color: "#ff0000" });

            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockRow]));

            const result = await repository.updateInWorkspace(folderId, workspaceId, {
                color: "#ff0000"
            });

            expect(result?.color).toBe("#ff0000");
        });
    });

    describe("delete", () => {
        it("should soft delete folder and promote children", async () => {
            const folderId = generateId();
            const userId = generateId();
            const mockFolder = generateFolderRow({
                id: folderId,
                user_id: userId,
                parent_id: null
            });

            // findByIdAndUserId
            mockQuery.mockResolvedValueOnce(mockRows([mockFolder]));
            // Promote children
            mockQuery.mockResolvedValueOnce(mockAffectedRows(2));
            // Clear folder_ids from items (5 queries)
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));
            // Soft delete
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.delete(folderId, userId);

            expect(result).toBe(true);
        });

        it("should return false when folder not found", async () => {
            mockQuery.mockResolvedValueOnce(mockEmptyResult());

            const result = await repository.delete("non-existent", generateId());

            expect(result).toBe(false);
        });
    });

    describe("isNameAvailable", () => {
        it("should return true when name is available", async () => {
            const userId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.isNameAvailable("New Folder", userId);

            expect(result).toBe(true);
        });

        it("should return false when name is taken", async () => {
            const userId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(1));

            const result = await repository.isNameAvailable("Existing Folder", userId);

            expect(result).toBe(false);
        });

        it("should check within same parent", async () => {
            const userId = generateId();
            const parentId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            await repository.isNameAvailable("Folder", userId, parentId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("COALESCE(parent_id"),
                expect.arrayContaining(["Folder", userId, parentId])
            );
        });

        it("should exclude specific folder when checking", async () => {
            const userId = generateId();
            const excludeId = generateId();

            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            await repository.isNameAvailable("Folder", userId, null, excludeId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND id != $4"),
                expect.arrayContaining(["Folder", userId, null, excludeId])
            );
        });
    });

    describe("isNameAvailableInWorkspace", () => {
        it("should check name availability in workspace", async () => {
            const workspaceId = generateId();
            mockQuery.mockResolvedValueOnce(mockAffectedRows(0));

            const result = await repository.isNameAvailableInWorkspace("New Folder", workspaceId);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining("AND workspace_id = $2"),
                expect.arrayContaining(["New Folder", workspaceId])
            );
            expect(result).toBe(true);
        });
    });

    describe("getDescendantIds", () => {
        it("should return all descendant folder IDs", async () => {
            const folderId = generateId();
            const descendantIds = [generateId(), generateId(), generateId()];

            mockQuery.mockResolvedValueOnce(mockRows(descendantIds.map((id) => ({ id }))));

            const result = await repository.getDescendantIds(folderId);

            expect(result).toHaveLength(3);
            expect(result).toEqual(descendantIds);
        });
    });

    describe("moveFolder", () => {
        it("should move folder to new parent", async () => {
            const folderId = generateId();
            const userId = generateId();
            const newParentId = generateId();
            const mockFolder = generateFolderRow({
                id: folderId,
                user_id: userId,
                parent_id: null
            });
            const mockNewParent = generateFolderRow({
                id: newParentId,
                user_id: userId,
                depth: 0
            });

            // Find folder
            mockQuery.mockResolvedValueOnce(mockRows([mockFolder]));
            // Find new parent
            mockQuery.mockResolvedValueOnce(mockRows([mockNewParent]));
            // Get descendants
            mockQuery.mockResolvedValueOnce(mockEmptyResult());
            // Get next position
            mockQuery.mockResolvedValueOnce(mockRows([{ max_position: 1 }]));
            // Update
            mockQuery.mockResolvedValueOnce(mockInsertReturning([mockFolder]));

            const result = await repository.moveFolder(folderId, userId, newParentId);

            expect(result).not.toBeNull();
        });

        it("should return existing folder when moving to same parent", async () => {
            const folderId = generateId();
            const userId = generateId();
            const parentId = generateId();
            const mockFolder = generateFolderRow({
                id: folderId,
                user_id: userId,
                parent_id: parentId
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockFolder]));

            const result = await repository.moveFolder(folderId, userId, parentId);

            expect(result).toEqual(expect.objectContaining({ id: folderId }));
        });

        it("should throw error when moving to own descendant", async () => {
            const folderId = generateId();
            const userId = generateId();
            const descendantId = generateId();
            const mockFolder = generateFolderRow({
                id: folderId,
                user_id: userId,
                parent_id: null,
                depth: 0
            });
            const mockDescendant = generateFolderRow({
                id: descendantId,
                user_id: userId,
                depth: 1
            });

            // Mock sequence:
            // 1. findByIdAndUserId(folderId, userId) - get folder being moved
            mockQuery.mockResolvedValueOnce(mockRows([mockFolder]));
            // 2. findByIdAndUserId(descendantId, userId) - get new parent
            mockQuery.mockResolvedValueOnce(mockRows([mockDescendant]));
            // 3. getDescendantIds(folderId) - get descendants of folder being moved
            mockQuery.mockResolvedValueOnce(mockRows([{ id: descendantId }]));
            // 4. getMaxDescendantDepth CTE query
            mockQuery.mockResolvedValueOnce(mockRows([{ max_depth: 1 }]));
            // 5. findById(folderId) called by getMaxDescendantDepth
            mockQuery.mockResolvedValueOnce(mockRows([mockFolder]));

            await expect(repository.moveFolder(folderId, userId, descendantId)).rejects.toThrow(
                "Cannot move folder into its own descendant"
            );
        });
    });

    describe("row mapping", () => {
        it("should correctly map all fields", async () => {
            const folderId = generateId();
            const now = new Date().toISOString();
            const mockRow = generateFolderRow({
                id: folderId,
                created_at: now,
                updated_at: now
            });

            mockQuery.mockResolvedValueOnce(mockRows([mockRow]));

            const result = await repository.findById(folderId);

            expect(result?.id).toBe(folderId);
            expect(result?.created_at).toBeInstanceOf(Date);
            expect(result?.updated_at).toBeInstanceOf(Date);
            expect(result?.deleted_at).toBeNull();
        });
    });
});
