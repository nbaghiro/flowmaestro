/**
 * Folder Routes Integration Tests
 *
 * Tests for:
 * - GET /folders - List folders
 * - POST /folders - Create folder
 * - GET /folders/tree - Get folder tree
 * - GET /folders/:id - Get folder by ID
 * - PATCH /folders/:id - Update folder
 * - DELETE /folders/:id - Delete folder
 * - GET /folders/:id/contents - Get folder contents
 * - GET /folders/:id/children - Get child folders
 * - POST /folders/move - Move items to folder
 * - POST /folders/:id/move - Move folder to new parent
 * - POST /folders/remove - Remove items from folder
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    TestUser,
    mockDbQuery
} from "../../../../../__tests__/helpers/fastify-test-client";

// Mock FolderRepository
const mockFolderRepo = {
    findByWorkspaceIdWithCounts: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    getItemCounts: jest.fn(),
    getFolderTreeByWorkspace: jest.fn(),
    getContentsInWorkspace: jest.fn(),
    getChildrenInWorkspace: jest.fn(),
    create: jest.fn(),
    updateInWorkspace: jest.fn(),
    deleteInWorkspace: jest.fn(),
    moveFolderInWorkspace: jest.fn(),
    isNameAvailableInWorkspace: jest.fn()
};

jest.mock("../../../../storage/repositories/FolderRepository", () => ({
    FolderRepository: jest.fn().mockImplementation(() => mockFolderRepo)
}));

describe("Folder Routes", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;
    const testWorkspaceId = "test-workspace-id";

    const mockFolder = {
        id: "folder-1",
        user_id: "user-1",
        workspace_id: testWorkspaceId,
        name: "Test Folder",
        color: "#6366f1",
        position: 0,
        parent_id: null,
        depth: 0,
        path: "/Test Folder",
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01")
    };

    const mockItemCounts = {
        workflows: 5,
        agents: 3,
        formInterfaces: 2,
        chatInterfaces: 1,
        knowledgeBases: 0,
        total: 11
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
        mockDbQuery.mockReset();
    });

    // =========================================================================
    // GET /folders - List Folders
    // =========================================================================
    describe("GET /folders", () => {
        it("should list all folders in workspace", async () => {
            const foldersWithCounts = [
                { ...mockFolder, itemCounts: mockItemCounts },
                {
                    ...mockFolder,
                    id: "folder-2",
                    name: "Another Folder",
                    itemCounts: { ...mockItemCounts, total: 5 }
                }
            ];
            mockFolderRepo.findByWorkspaceIdWithCounts.mockResolvedValueOnce(foldersWithCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
            expect(mockFolderRepo.findByWorkspaceIdWithCounts).toHaveBeenCalledWith(
                testWorkspaceId
            );
        });

        it("should return empty array when no folders exist", async () => {
            mockFolderRepo.findByWorkspaceIdWithCounts.mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(0);
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // POST /folders - Create Folder
    // =========================================================================
    describe("POST /folders", () => {
        it("should create a folder with required fields", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValueOnce(true);
            mockFolderRepo.create.mockResolvedValueOnce(mockFolder);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: {
                    name: "New Folder"
                }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { id: string; name: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe("folder-1");
            expect(body.data.name).toBe("Test Folder");
        });

        it("should create a folder with color and parent", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValueOnce(true);
            const folderWithParent = { ...mockFolder, parent_id: "parent-folder-id", depth: 1 };
            mockFolderRepo.create.mockResolvedValueOnce(folderWithParent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: {
                    name: "Child Folder",
                    color: "#ff0000",
                    parentId: "parent-folder-id"
                }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { parentId: string | null } }>();
            expect(body.success).toBe(true);
            expect(body.data.parentId).toBe("parent-folder-id");
        });

        it("should return 400 when name is missing", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: {}
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.success).toBe(false);
            expect(body.error).toContain("name is required");
        });

        it("should return 400 when name is empty", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: {
                    name: "   "
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.success).toBe(false);
            expect(body.error).toContain("name is required");
        });

        it("should return 400 when name exceeds 100 characters", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: {
                    name: "a".repeat(101)
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.success).toBe(false);
            expect(body.error).toContain("100 characters or less");
        });

        it("should return 400 for invalid hex color", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: {
                    name: "Test Folder",
                    color: "not-a-color"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.success).toBe(false);
            expect(body.error).toContain("Invalid folder color");
        });

        it("should return 400 when folder name already exists at root", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: {
                    name: "Existing Folder"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.success).toBe(false);
            expect(body.error).toContain("already exists");
        });
    });

    // =========================================================================
    // GET /folders/tree - Get Folder Tree
    // =========================================================================
    describe("GET /folders/tree", () => {
        it("should return folder tree structure", async () => {
            const tree = [
                {
                    id: "folder-1",
                    name: "Parent",
                    children: [{ id: "folder-2", name: "Child", children: [] }]
                }
            ];
            mockFolderRepo.getFolderTreeByWorkspace.mockResolvedValueOnce(tree);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.success).toBe(true);
            expect(body.data).toEqual(tree);
            expect(mockFolderRepo.getFolderTreeByWorkspace).toHaveBeenCalledWith(testWorkspaceId);
        });

        it("should return empty array for empty workspace", async () => {
            mockFolderRepo.getFolderTreeByWorkspace.mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.success).toBe(true);
            expect(body.data).toEqual([]);
        });
    });

    // =========================================================================
    // GET /folders/:id - Get Folder
    // =========================================================================
    describe("GET /folders/:id", () => {
        it("should return folder by ID", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            mockFolderRepo.getItemCounts.mockResolvedValueOnce(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: { id: string; itemCounts: unknown };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe("folder-1");
            expect(body.data.itemCounts).toEqual(mockItemCounts);
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/non-existent"
            });

            expect(response.statusCode).toBe(404);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.success).toBe(false);
            expect(body.error).toBe("Folder not found");
        });
    });

    // =========================================================================
    // PATCH /folders/:id - Update Folder
    // =========================================================================
    describe("PATCH /folders/:id", () => {
        it("should update folder name", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValueOnce(true);
            const updatedFolder = { ...mockFolder, name: "Updated Name" };
            mockFolderRepo.updateInWorkspace.mockResolvedValueOnce(updatedFolder);
            mockFolderRepo.getItemCounts.mockResolvedValueOnce(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: {
                    name: "Updated Name"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { name: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("Updated Name");
        });

        it("should update folder color", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            const updatedFolder = { ...mockFolder, color: "#ff0000" };
            mockFolderRepo.updateInWorkspace.mockResolvedValueOnce(updatedFolder);
            mockFolderRepo.getItemCounts.mockResolvedValueOnce(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: {
                    color: "#ff0000"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { color: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.color).toBe("#ff0000");
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/non-existent",
                payload: {
                    name: "Updated"
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for empty name", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: {
                    name: "   "
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("cannot be empty");
        });

        it("should return 400 for invalid color format", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: {
                    color: "red"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Invalid folder color");
        });

        it("should return 400 when new name conflicts with existing folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: {
                    name: "Conflicting Name"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("already exists");
        });

        it("should move folder to new parent", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            const movedFolder = { ...mockFolder, parent_id: "new-parent", depth: 1 };
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValueOnce(movedFolder);
            mockFolderRepo.getItemCounts.mockResolvedValueOnce(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: {
                    parentId: "new-parent"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { parentId: string } }>();
            expect(body.data.parentId).toBe("new-parent");
        });
    });

    // =========================================================================
    // DELETE /folders/:id - Delete Folder
    // =========================================================================
    describe("DELETE /folders/:id", () => {
        it("should delete folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            mockFolderRepo.deleteInWorkspace.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
            expect(body.message).toContain("deleted");
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/folders/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 500 if delete fails", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            mockFolderRepo.deleteInWorkspace.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(500);
        });
    });

    // =========================================================================
    // GET /folders/:id/contents - Get Folder Contents
    // =========================================================================
    describe("GET /folders/:id/contents", () => {
        it("should return folder contents", async () => {
            const contents = {
                workflows: [{ id: "wf-1", name: "Workflow 1" }],
                agents: [{ id: "ag-1", name: "Agent 1" }],
                formInterfaces: [],
                chatInterfaces: [],
                knowledgeBases: []
            };
            mockFolderRepo.getContentsInWorkspace.mockResolvedValueOnce(contents);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/contents"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: typeof contents }>();
            expect(body.success).toBe(true);
            expect(body.data.workflows).toHaveLength(1);
            expect(body.data.agents).toHaveLength(1);
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.getContentsInWorkspace.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/non-existent/contents"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // GET /folders/:id/children - Get Folder Children
    // =========================================================================
    describe("GET /folders/:id/children", () => {
        it("should return child folders", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            const children = [
                { id: "child-1", name: "Child 1" },
                { id: "child-2", name: "Child 2" }
            ];
            mockFolderRepo.getChildrenInWorkspace.mockResolvedValueOnce(children);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/children"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: typeof children }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
        });

        it("should return empty array when no children exist", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            mockFolderRepo.getChildrenInWorkspace.mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/children"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(0);
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/non-existent/children"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // POST /folders/move - Move Items to Folder
    // =========================================================================
    describe("POST /folders/move", () => {
        it("should move items to folder", async () => {
            // Mock verify query - items exist
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }, { id: "wf-2" }],
                rowCount: 2
            });
            // Mock folder lookup
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            // Mock update query
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
            const body = response.json<{ success: boolean; data: { movedCount: number } }>();
            expect(body.success).toBe(true);
            expect(body.data.movedCount).toBe(2);
        });

        it("should return 400 when itemIds is empty", async () => {
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
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("At least one item ID");
        });

        it("should return 400 when itemType is missing", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/move",
                payload: {
                    itemIds: ["wf-1"],
                    folderId: "folder-1"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Item type is required");
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
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Invalid item type");
        });

        it("should return 400 when items not found in workspace", async () => {
            // Mock verify query - only 1 item found out of 2
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }],
                rowCount: 1
            });

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
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("not found");
        });

        it("should return 400 when folderId is null", async () => {
            // Mock verify query - items exist
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }],
                rowCount: 1
            });

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
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Folder ID is required");
        });

        it("should return 404 when target folder not found", async () => {
            // Mock verify query - items exist
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }],
                rowCount: 1
            });
            // Mock folder lookup - not found
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

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
    });

    // =========================================================================
    // POST /folders/:id/move - Move Folder
    // =========================================================================
    describe("POST /folders/:id/move", () => {
        it("should move folder to new parent", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            const movedFolder = { ...mockFolder, parent_id: "new-parent", depth: 1 };
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValueOnce(movedFolder);
            mockFolderRepo.getItemCounts.mockResolvedValueOnce(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: {
                    newParentId: "new-parent"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { parentId: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.parentId).toBe("new-parent");
        });

        it("should move folder to root (null parent)", async () => {
            const nestedFolder = { ...mockFolder, parent_id: "old-parent", depth: 1 };
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(nestedFolder);
            const movedFolder = { ...mockFolder, parent_id: null, depth: 0 };
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValueOnce(movedFolder);
            mockFolderRepo.getItemCounts.mockResolvedValueOnce(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: {
                    newParentId: null
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { parentId: string | null } }>();
            expect(body.data.parentId).toBeNull();
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/non-existent/move",
                payload: {
                    newParentId: "some-parent"
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 when moving to descendant", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            mockFolderRepo.moveFolderInWorkspace.mockRejectedValueOnce(
                new Error("Cannot move folder to its descendant")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/folder-1/move",
                payload: {
                    newParentId: "child-folder"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("descendant");
        });
    });

    // =========================================================================
    // POST /folders/remove - Remove Items from Folder
    // =========================================================================
    describe("POST /folders/remove", () => {
        it("should remove items from specific folder", async () => {
            // Mock verify query - items exist
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }],
                rowCount: 1
            });
            // Mock folder lookup
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockFolder);
            // Mock update query
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
            const body = response.json<{ success: boolean; data: { removedCount: number } }>();
            expect(body.success).toBe(true);
            expect(body.data.removedCount).toBe(1);
        });

        it("should remove items from all folders (null folderId)", async () => {
            // Mock verify query - items exist
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }, { id: "wf-2" }],
                rowCount: 2
            });
            // Mock update query (clears folder_ids array)
            mockDbQuery.mockResolvedValueOnce({ rowCount: 2 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["wf-1", "wf-2"],
                    itemType: "workflow"
                    // folderId omitted = remove from all folders
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { removedCount: number } }>();
            expect(body.data.removedCount).toBe(2);
        });

        it("should return 400 when itemIds is empty", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: [],
                    itemType: "workflow"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("At least one item ID");
        });

        it("should return 400 when itemType is missing", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["wf-1"]
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Item type is required");
        });

        it("should return 404 when folderId specified but not found", async () => {
            // Mock verify query - items exist
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "wf-1" }],
                rowCount: 1
            });
            // Mock folder lookup - not found
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

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

        it("should support agent itemType", async () => {
            // Mock verify query - agents exist
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "ag-1" }],
                rowCount: 1
            });
            // Mock update query
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["ag-1"],
                    itemType: "agent"
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should support form-interface itemType", async () => {
            mockDbQuery.mockResolvedValueOnce({
                rows: [{ id: "fi-1" }],
                rowCount: 1
            });
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders/remove",
                payload: {
                    itemIds: ["fi-1"],
                    itemType: "form-interface"
                }
            });

            expect(response.statusCode).toBe(200);
        });
    });
});
