/**
 * Folder Tree and Hierarchy Tests
 *
 * Tests for folder tree, contents, and children endpoints.
 */

import { FastifyInstance } from "fastify";
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
import type { TestUser, MockItemCounts } from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../storage/repositories/FolderRepository", () => ({
    FolderRepository: jest.fn().mockImplementation(() => mockFolderRepo)
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Folder Tree and Hierarchy", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;

    const mockFolder = createMockFolder({ id: "folder-1", name: "Test Folder" });

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
    // GET /folders/tree - Get Folder Tree
    // =========================================================================
    describe("GET /folders/tree", () => {
        it("should get hierarchical tree structure", async () => {
            const tree = [
                {
                    id: "parent-1",
                    name: "Parent",
                    children: [{ id: "child-1", name: "Child", children: [] }]
                }
            ];
            mockFolderRepo.getFolderTreeByWorkspace.mockResolvedValue(tree);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: typeof tree }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].children).toHaveLength(1);
        });

        it("should return root level folders at top level", async () => {
            const tree = [
                { id: "root-1", name: "Root 1", parentId: null, children: [] },
                { id: "root-2", name: "Root 2", parentId: null, children: [] }
            ];
            mockFolderRepo.getFolderTreeByWorkspace.mockResolvedValue(tree);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ data: Array<{ parentId: string | null }> }>();
            expect(body.data[0].parentId).toBeNull();
        });

        it("should nest children correctly", async () => {
            const tree = [
                {
                    id: "grandparent",
                    name: "Grandparent",
                    children: [
                        {
                            id: "parent",
                            name: "Parent",
                            children: [{ id: "child", name: "Child", children: [] }]
                        }
                    ]
                }
            ];
            mockFolderRepo.getFolderTreeByWorkspace.mockResolvedValue(tree);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ data: Array<{ children: unknown[] }> }>();
            expect(body.data[0].children[0]).toHaveProperty("children");
        });

        it("should return empty array for empty workspace", async () => {
            mockFolderRepo.getFolderTreeByWorkspace.mockResolvedValue([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: unknown[] }>().data).toEqual([]);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /folders/:id/contents - Get Folder Contents
    // =========================================================================
    describe("GET /folders/:id/contents", () => {
        it("should get folder contents with all item types", async () => {
            const contents = {
                folder: { id: "folder-1", ancestors: [] },
                items: {
                    workflows: [{ id: "wf-1", name: "Workflow 1" }],
                    agents: [{ id: "ag-1", name: "Agent 1" }],
                    formInterfaces: [],
                    chatInterfaces: [],
                    knowledgeBases: []
                },
                itemCounts: createMockItemCounts({ workflows: 1, agents: 1 }),
                subfolders: []
            };
            mockFolderRepo.getContentsInWorkspace.mockResolvedValue(contents);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/contents"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ data: typeof contents }>();
            expect(body.data.items.workflows).toHaveLength(1);
            expect(body.data.items.agents).toHaveLength(1);
        });

        it("should include subfolders in contents", async () => {
            const contents = {
                folder: { id: "folder-1", ancestors: [] },
                items: {
                    workflows: [],
                    agents: [],
                    formInterfaces: [],
                    chatInterfaces: [],
                    knowledgeBases: []
                },
                itemCounts: createMockItemCounts(),
                subfolders: [
                    createMockFolderWithCounts({ name: "Subfolder 1" }),
                    createMockFolderWithCounts({ name: "Subfolder 2" })
                ]
            };
            mockFolderRepo.getContentsInWorkspace.mockResolvedValue(contents);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/contents"
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: typeof contents }>().data.subfolders).toHaveLength(2);
        });

        it("should include breadcrumb ancestors", async () => {
            const contents = {
                folder: {
                    id: "child-folder",
                    ancestors: [{ id: "parent", name: "Parent" }]
                },
                items: {
                    workflows: [],
                    agents: [],
                    formInterfaces: [],
                    chatInterfaces: [],
                    knowledgeBases: []
                },
                itemCounts: createMockItemCounts(),
                subfolders: []
            };
            mockFolderRepo.getContentsInWorkspace.mockResolvedValue(contents);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/child-folder/contents"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ data: typeof contents }>();
            expect(body.data.folder.ancestors).toHaveLength(1);
        });

        it("should return empty arrays for empty folder", async () => {
            const contents = {
                folder: { id: "empty-folder", ancestors: [] },
                items: {
                    workflows: [],
                    agents: [],
                    formInterfaces: [],
                    chatInterfaces: [],
                    knowledgeBases: []
                },
                itemCounts: createMockItemCounts(),
                subfolders: []
            };
            mockFolderRepo.getContentsInWorkspace.mockResolvedValue(contents);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/empty-folder/contents"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ data: typeof contents }>();
            expect(body.data.items.workflows).toHaveLength(0);
            expect(body.data.subfolders).toHaveLength(0);
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.getContentsInWorkspace.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/non-existent/contents"
            });

            expect(response.statusCode).toBe(404);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/folders/folder-1/contents"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /folders/:id/children - Get Folder Children
    // =========================================================================
    describe("GET /folders/:id/children", () => {
        it("should get direct children folders", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            const children = [
                createMockFolderWithCounts({ name: "Child 1" }),
                createMockFolderWithCounts({ name: "Child 2" })
            ];
            mockFolderRepo.getChildrenInWorkspace.mockResolvedValue(children);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/children"
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: unknown[] }>().data).toHaveLength(2);
        });

        it("should include item counts in children", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            const children = [
                createMockFolderWithCounts({
                    itemCounts: createMockItemCounts({ workflows: 5, agents: 2 })
                })
            ];
            mockFolderRepo.getChildrenInWorkspace.mockResolvedValue(children);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/children"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                data: Array<{ itemCounts: MockItemCounts }>;
            }>();
            expect(body.data[0].itemCounts.workflows).toBe(5);
            expect(body.data[0].itemCounts.total).toBe(7);
        });

        it("should return empty array when no children exist", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.getChildrenInWorkspace.mockResolvedValue([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/children"
            });

            expect(response.statusCode).toBe(200);
            expect(response.json<{ data: unknown[] }>().data).toHaveLength(0);
        });

        it("should return 404 for non-existent folder", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/non-existent/children"
            });

            expect(response.statusCode).toBe(404);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/folders/folder-1/children"
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
