/**
 * Folder CRUD Operations Tests
 *
 * Tests for folder create, list, get, update, and delete endpoints.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    mockFolderRepo,
    createMockFolder,
    createMockItemCounts,
    createMockFolderWithCounts,
    resetAllMocks,
    createFolderTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest
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

describe("Folder CRUD Operations", () => {
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
    // POST /folders - Create Folder
    // =========================================================================
    describe("POST /folders", () => {
        it("should create a folder with valid name", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(true);
            mockFolderRepo.create.mockResolvedValue(mockFolder);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "New Folder" }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { id: string; name: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe("folder-1");
        });

        it("should create a folder with custom color", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(true);
            const folderWithColor = createMockFolder({ color: "#ff5733" });
            mockFolderRepo.create.mockResolvedValue(folderWithColor);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "Colored Folder", color: "#FF5733" }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { color: string } }>();
            expect(body.data.color).toBe("#ff5733");
        });

        it("should create a folder with parentId", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(true);
            const parentId = uuidv4();
            const childFolder = createMockFolder({ parent_id: parentId, depth: 1 });
            mockFolderRepo.create.mockResolvedValue(childFolder);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "Child Folder", parentId }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { parentId: string | null } }>();
            expect(body.data.parentId).toBe(parentId);
        });

        it("should return 400 for missing name field", async () => {
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

        it("should return 400 for empty name string", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "   " }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("name is required");
        });

        it("should return 400 for name exceeding 100 characters", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "a".repeat(101) }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("100 characters or less");
        });

        it("should return 400 for invalid hex color format", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "Test", color: "invalid-color" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("Invalid folder color");
        });

        it("should return 400 for duplicate name in same parent", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "Existing Folder" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("already exists");
        });

        it("should return 500 when parent folder not found", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(true);
            mockFolderRepo.create.mockRejectedValue(new Error("Parent folder not found"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "Child", parentId: uuidv4() }
            });

            expect(response.statusCode).toBe(500);
            expect(response.json<{ error: string }>().error).toContain("Parent folder not found");
        });

        it("should return 500 when max nesting depth exceeded", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(true);
            mockFolderRepo.create.mockRejectedValue(
                new Error("Maximum folder nesting depth (5 levels) exceeded")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "Deep Folder", parentId: uuidv4() }
            });

            expect(response.statusCode).toBe(500);
            expect(response.json<{ error: string }>().error).toContain("nesting depth");
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/folders",
                payload: { name: "Test" }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /folders - List Folders
    // =========================================================================
    describe("GET /folders", () => {
        it("should list folders for workspace", async () => {
            const folders = [
                createMockFolderWithCounts({ name: "Folder 1" }),
                createMockFolderWithCounts({ name: "Folder 2" })
            ];
            mockFolderRepo.findByWorkspaceIdWithCounts.mockResolvedValue(folders);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
        });

        it("should return empty array for workspace with no folders", async () => {
            mockFolderRepo.findByWorkspaceIdWithCounts.mockResolvedValue([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: unknown[] }>();
            expect(body.data).toHaveLength(0);
        });

        it("should include item counts in folders", async () => {
            const folders = [
                createMockFolderWithCounts({
                    itemCounts: createMockItemCounts({ workflows: 2, agents: 1 })
                })
            ];
            mockFolderRepo.findByWorkspaceIdWithCounts.mockResolvedValue(folders);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                data: Array<{ itemCounts: { workflows: number; total: number } }>;
            }>();
            expect(body.data[0].itemCounts.workflows).toBe(2);
            expect(body.data[0].itemCounts.total).toBe(3);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /folders/:id - Get Folder
    // =========================================================================
    describe("GET /folders/:id", () => {
        it("should get folder by ID", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { id: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe("folder-1");
        });

        it("should include item counts in response", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                data: { itemCounts: { workflows: number; total: number } };
            }>();
            expect(body.data.itemCounts.workflows).toBe(5);
            expect(body.data.itemCounts.total).toBe(11);
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/non-existent"
            });

            expect(response.statusCode).toBe(404);
            expect(response.json<{ error: string }>().error).toBe("Folder not found");
        });

        it("should return 404 for folder in different workspace (multi-tenant)", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/folders/${uuidv4()}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // PATCH /folders/:id - Update Folder
    // =========================================================================
    describe("PATCH /folders/:id", () => {
        it("should update folder name", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(true);
            const updated = { ...mockFolder, name: "Updated Name" };
            mockFolderRepo.updateInWorkspace.mockResolvedValue(updated);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { name: "Updated Name" }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { name: string } }>().data.name).toBe("Updated Name");
        });

        it("should update folder color", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            const updated = { ...mockFolder, color: "#ff0000" };
            mockFolderRepo.updateInWorkspace.mockResolvedValue(updated);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { color: "#ff0000" }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { color: string } }>().data.color).toBe("#ff0000");
        });

        it("should update folder position", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            const updated = { ...mockFolder, position: 5 };
            mockFolderRepo.updateInWorkspace.mockResolvedValue(updated);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { position: 5 }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { position: number } }>().data.position).toBe(5);
        });

        it("should move folder to new parent", async () => {
            const newParentId = uuidv4();
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            const moved = { ...mockFolder, parent_id: newParentId, depth: 1 };
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValue(moved);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { parentId: newParentId }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { parentId: string } }>().data.parentId).toBe(newParentId);
        });

        it("should move folder to root level with parentId null", async () => {
            const nestedFolder = { ...mockFolder, parent_id: "old-parent", depth: 1 };
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(nestedFolder);
            const moved = { ...mockFolder, parent_id: null, depth: 0 };
            mockFolderRepo.moveFolderInWorkspace.mockResolvedValue(moved);
            mockFolderRepo.getItemCounts.mockResolvedValue(mockItemCounts);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { parentId: null }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: { parentId: string | null } }>().data.parentId).toBeNull();
        });

        it("should return 400 for empty name", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { name: "   " }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("cannot be empty");
        });

        it("should return 400 for invalid color format", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { color: "not-a-color" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("Invalid folder color");
        });

        it("should return 400 for duplicate name in new parent", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { name: "Conflicting Name" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json<{ error: string }>().error).toContain("already exists");
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: "/folders/non-existent",
                payload: { name: "Updated" }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "PATCH",
                url: "/folders/folder-1",
                payload: { name: "Updated" }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // DELETE /folders/:id - Delete Folder
    // =========================================================================
    describe("DELETE /folders/:id", () => {
        it("should delete folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.deleteInWorkspace.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
        });

        it("should return message about items moved to root", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.deleteInWorkspace.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ message: string }>().message).toContain("moved to root");
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/folders/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 500 when delete operation fails", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.deleteInWorkspace.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(500);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "DELETE",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
