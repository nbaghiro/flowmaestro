/**
 * Folder Move Operations Tests
 *
 * Tests for moving items to folders, moving folders, and removing items from folders.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    mockFolderRepo,
    createMockFolder,
    createMockItemCounts,
    resetAllMocks,
    createFolderTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    mockDbQuery
} from "./helpers/test-utils";
import type { TestUser } from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../storage/repositories/FolderRepository", () => ({
    FolderRepository: jest.fn().mockImplementation(() => mockFolderRepo)
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Folder Move Operations", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;

    const mockFolder = createMockFolder({ id: "folder-1", name: "Test Folder" });
    const mockItemCounts = createMockItemCounts({
        workflows: 5,
        agents: 3,
        formInterfaces: 2,
        chatInterfaces: 1,
        knowledgeBases: 0
    });

    beforeAll(async () => {
        fastify = await createFolderTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        testUser = createTestUser();
        resetAllMocks();
    });

    // =========================================================================
    // POST /folders/move - Move Items to Folder
    // =========================================================================
    describe("POST /folders/move", () => {
        it("should move workflows to folder", async () => {
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }, { id: "wf-2" }],
                rowCount: 2
            });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockDbQuery.mockResolvedValueOnce({ rowCount: 2 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["wf-1", "wf-2"],
                    itemType: "workflow",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { movedCount: number } }>().data.movedCount).toBe(2);
        });

        it("should move agents to folder", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "ag-1" }], rowCount: 1 });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["ag-1"],
                    itemType: "agent",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { movedCount: number } }>().data.movedCount).toBe(1);
        });

        it("should move form interfaces to folder", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "fi-1" }], rowCount: 1 });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["fi-1"],
                    itemType: "form-interface",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should move chat interfaces to folder", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "ci-1" }], rowCount: 1 });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["ci-1"],
                    itemType: "chat-interface",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should move knowledge bases to folder", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "kb-1" }], rowCount: 1 });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["kb-1"],
                    itemType: "knowledge-base",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should return 400 for empty itemIds array", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: [],
                    itemType: "workflow",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("At least one item ID");
        });

        it("should return 400 for missing itemType", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["wf-1"],
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("Item type is required");
        });

        it("should return 400 for invalid itemType", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["item-1"],
                    itemType: "invalid-type",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("Invalid item type");
        });

        it("should return 400 when items not found in workspace", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "wf-1" }], rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["wf-1", "wf-2"],
                    itemType: "workflow",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("not found");
        });

        it("should return 400 when folderId is missing", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "wf-1" }], rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["wf-1"],
                    itemType: "workflow",
                    folderId: null
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("Folder ID is required");
        });

        it("should return 404 when folder not found", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "wf-1" }], rowCount: 1 });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["wf-1"],
                    itemType: "workflow",
                    folderId: "non-existent"
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["wf-1"],
                    itemType: "workflow",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // POST /folders/:id/move - Move Folder
    // =========================================================================
    describe("POST /folders/:id/move", () => {
        it("should move folder to new parent", async () => {
            const newParentId = uuidv4();
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            const moved = { ...mockFolder, parent_id: newParentId, depth: 1 };
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValue(moved);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: { newParentId }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { parentId: string } }>().data.parentId).toBe(newParentId);
        });

        it("should move folder to root level", async () => {
            const nested = { ...mockFolder, parent_id: "old-parent", depth: 1 };
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(nested);
            const moved = { ...mockFolder, parent_id: null, depth: 0 };
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValue(moved);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: { newParentId: null }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { parentId: string | null } }>().data.parentId).toBeNull();
        });

        it("should return 404 when folder not found", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/non-existent/move",
                payload: { newParentId: null }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 when target parent not found", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.moveFolderInWorkspace.mockRejectedValue(
                new Error("Target folder not found")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: { newParentId: uuidv4() }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("not found");
        });

        it("should return 400 when moving folder into its own descendant", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.moveFolderInWorkspace.mockRejectedValue(
                new Error("Cannot move folder into its own descendant")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: { newParentId: "child-folder" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("descendant");
        });

        it("should return 400 when max depth exceeded", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.moveFolderInWorkspace.mockRejectedValue(
                new Error("Maximum folder nesting depth exceeded")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: { newParentId: "deep-folder" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("depth");
        });

        it("should handle same parent (no-op)", async () => {
            const parentId = "same-parent";
            const folder = { ...mockFolder, parent_id: parentId };
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(folder);
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValue(folder);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: { newParentId: parentId }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: { newParentId: null }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // POST /folders/remove - Remove Items from Folder
    // =========================================================================
    describe("POST /folders/remove", () => {
        it("should remove items from specific folder", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "wf-1" }], rowCount: 1 });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["wf-1"],
                    itemType: "workflow",
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { removedCount: number } }>().data.removedCount).toBe(1);
        });

        it("should remove items from all folders (no folderId)", async () => {
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }, { id: "wf-2" }],
                rowCount: 2
            });
            mockDbQuery.mockResolvedValueOnce({ rowCount: 2 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["wf-1", "wf-2"],
                    itemType: "workflow"
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { removedCount: number } }>().data.removedCount).toBe(2);
        });

        it("should return 400 for empty itemIds array", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: [],
                    itemType: "workflow"
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("At least one item ID");
        });

        it("should return 400 for missing itemType", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["wf-1"]
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("Item type is required");
        });

        it("should return 400 for invalid itemType", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["item-1"],
                    itemType: "invalid-type"
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("Invalid item type");
        });

        it("should return 400 when items not found", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["non-existent"],
                    itemType: "workflow"
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("not found");
        });

        it("should return 404 when folderId provided but folder not found", async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [{ id: "wf-1" }], rowCount: 1 });
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["wf-1"],
                    itemType: "workflow",
                    folderId: "non-existent"
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["wf-1"],
                    itemType: "workflow"
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
