/**
 * Folder Multi-Tenant Isolation and Error Handling Tests
 *
 * Tests for workspace isolation, error handling, and authentication requirements.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    mockFolderRepo,
    createMockFolder,
    resetAllMocks,
    createFolderTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
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

describe("Folder Multi-Tenant Isolation", () => {
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
    // MULTI-TENANT ISOLATION
    // =========================================================================
    describe("Multi-tenant isolation", () => {
        it("should only list folders for current workspace", async () => {
            mockFolderRepo.findByWorkspaceIdWithCounts.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders"
            });

            expect(mockFolderRepo.findByWorkspaceIdWithCounts).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should not allow access to folder in different workspace", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/folders/${uuidv4()}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should create folder in current workspace", async () => {
            mockFolderRepo.isNameAvailableInWorkspace.mockResolvedValue(true);
            mockFolderRepo.create.mockResolvedValue(mockFolder);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/folders",
                payload: { name: "Test" }
            });

            expect(mockFolderRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace_id: DEFAULT_TEST_WORKSPACE_ID
                })
            );
        });

        it("should get tree for current workspace only", async () => {
            mockFolderRepo.getFolderTreeByWorkspace.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(mockFolderRepo.getFolderTreeByWorkspace).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID
            );
        });
    });

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================
    describe("Error handling", () => {
        it("should return 500 when repository throws on list", async () => {
            mockFolderRepo.findByWorkspaceIdWithCounts.mockRejectedValue(
                new Error("Database error")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders"
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 500 when repository throws on get", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1"
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 500 when repository throws on tree", async () => {
            mockFolderRepo.getFolderTreeByWorkspace.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/tree"
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 500 when repository throws on contents", async () => {
            mockFolderRepo.getContentsInWorkspace.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/contents"
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 500 when repository throws on children", async () => {
            mockFolderRepo.findByIdAndWorkspaceId.mockResolvedValue(mockFolder);
            mockFolderRepo.getChildrenInWorkspace.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/folders/folder-1/children"
            });

            expect(response.statusCode).toBe(500);
        });
    });

    // =========================================================================
    // AUTHENTICATION REQUIREMENTS
    // =========================================================================
    describe("Authentication requirements", () => {
        const authTests = [
            { method: "GET" as const, url: "/folders" },
            { method: "GET" as const, url: "/folders/tree" },
            { method: "GET" as const, url: "/folders/folder-1" },
            { method: "POST" as const, url: "/folders", payload: { name: "Test" } },
            { method: "PATCH" as const, url: "/folders/folder-1", payload: { name: "Test" } },
            { method: "DELETE" as const, url: "/folders/folder-1" },
            { method: "GET" as const, url: "/folders/folder-1/contents" },
            { method: "GET" as const, url: "/folders/folder-1/children" },
            {
                method: "POST" as const,
                url: "/folders/move",
                payload: { itemIds: ["x"], itemType: "workflow", folderId: "y" }
            },
            {
                method: "POST" as const,
                url: "/folders/folder-1/move",
                payload: { newParentId: null }
            },
            {
                method: "POST" as const,
                url: "/folders/remove",
                payload: { itemIds: ["x"], itemType: "workflow" }
            }
        ];

        it.each(authTests)(
            "$method $url should require authentication",
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
