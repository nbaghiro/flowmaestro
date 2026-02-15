/**
 * Confluence Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreatePage } from "../operations/createPage";
import { executeGetPage } from "../operations/getPage";
import { executeGetPageChildren } from "../operations/getPageChildren";
import { executeGetSpace } from "../operations/getSpace";
import { executeListPages } from "../operations/listPages";
import { executeListSpaces } from "../operations/listSpaces";
import { executeSearchContent } from "../operations/searchContent";
import {
    listSpacesInputSchema,
    getSpaceInputSchema,
    listPagesInputSchema,
    getPageInputSchema,
    createPageInputSchema,
    updatePageInputSchema,
    searchContentInputSchema,
    getPageChildrenInputSchema
} from "../operations/types";
import { executeUpdatePage } from "../operations/updatePage";
import type { ConfluenceClient } from "../client/ConfluenceClient";

// Mock ConfluenceClient factory
function createMockConfluenceClient(): jest.Mocked<ConfluenceClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<ConfluenceClient>;
}

describe("Confluence Operation Executors", () => {
    let mockClient: jest.Mocked<ConfluenceClient>;

    beforeEach(() => {
        mockClient = createMockConfluenceClient();
    });

    // ============================================================================
    // SPACE OPERATIONS
    // ============================================================================

    describe("executeListSpaces", () => {
        it("calls client with correct URL when no params provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeListSpaces(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/wiki/api/v2/spaces");
        });

        it("calls client with all query params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeListSpaces(mockClient, {
                limit: 50,
                cursor: "abc123",
                type: "global"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/wiki/api/v2/spaces?limit=50&cursor=abc123&type=global"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [
                    {
                        id: "65536",
                        key: "ENG",
                        name: "Engineering",
                        type: "global",
                        status: "current",
                        description: { plain: { value: "Engineering space" } },
                        _links: { webui: "/spaces/ENG" }
                    },
                    {
                        id: "65537",
                        key: "DOCS",
                        name: "Documentation",
                        type: "global",
                        status: "current"
                    }
                ],
                _links: { next: "/wiki/api/v2/spaces?cursor=xyz" }
            });

            const result = await executeListSpaces(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                spaces: [
                    {
                        id: "65536",
                        key: "ENG",
                        name: "Engineering",
                        type: "global",
                        status: "current",
                        description: { plain: { value: "Engineering space" } },
                        _links: { webui: "/spaces/ENG" }
                    },
                    {
                        id: "65537",
                        key: "DOCS",
                        name: "Documentation",
                        type: "global",
                        status: "current"
                    }
                ],
                hasMore: true
            });
        });

        it("returns hasMore false when no next link", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            const result = await executeListSpaces(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(
                new Error("Insufficient permissions for this Confluence operation")
            );

            const result = await executeListSpaces(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Insufficient permissions for this Confluence operation"
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeListSpaces(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list spaces");
        });
    });

    describe("executeGetSpace", () => {
        it("calls client with correct URL", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "65536",
                key: "ENG",
                name: "Engineering",
                type: "global",
                status: "current"
            });

            await executeGetSpace(mockClient, { spaceId: "65536" });

            expect(mockClient.get).toHaveBeenCalledWith("/wiki/api/v2/spaces/65536");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "65536",
                key: "ENG",
                name: "Engineering",
                type: "global",
                status: "current",
                description: { plain: { value: "Engineering team space" } },
                homepageId: "131072",
                _links: { webui: "/spaces/ENG" }
            });

            const result = await executeGetSpace(mockClient, { spaceId: "65536" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "65536",
                key: "ENG",
                name: "Engineering",
                type: "global",
                status: "current",
                description: { plain: { value: "Engineering team space" } },
                homepageId: "131072",
                _links: { webui: "/spaces/ENG" }
            });
        });

        it("returns error when space not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Resource not found in Confluence"));

            const result = await executeGetSpace(mockClient, { spaceId: "99999" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Confluence");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce(null);

            const result = await executeGetSpace(mockClient, { spaceId: "65536" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get space");
        });
    });

    // ============================================================================
    // PAGE OPERATIONS
    // ============================================================================

    describe("executeListPages", () => {
        it("calls client with correct URL when no params provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeListPages(mockClient, {});

            expect(mockClient.get).toHaveBeenCalledWith("/wiki/api/v2/pages");
        });

        it("calls client with all query params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeListPages(mockClient, {
                spaceId: "65536",
                limit: 25,
                cursor: "xyz789",
                status: "current"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/wiki/api/v2/pages?space-id=65536&limit=25&cursor=xyz789&status=current"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [
                    {
                        id: "131072",
                        title: "Getting Started",
                        status: "current",
                        spaceId: "65536",
                        parentId: undefined,
                        version: { number: 3 },
                        _links: { webui: "/pages/131072" }
                    },
                    {
                        id: "131073",
                        title: "Architecture Overview",
                        status: "current",
                        spaceId: "65536",
                        parentId: "131072",
                        version: { number: 1 }
                    }
                ],
                _links: {}
            });

            const result = await executeListPages(mockClient, { spaceId: "65536" });

            expect(result.success).toBe(true);
            expect(result.data?.pages).toHaveLength(2);
            expect(result.data?.pages[0]).toEqual({
                id: "131072",
                title: "Getting Started",
                status: "current",
                spaceId: "65536",
                parentId: undefined,
                version: { number: 3 },
                _links: { webui: "/pages/131072" }
            });
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns hasMore true when next link present", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [{ id: "1", title: "Page", status: "current", spaceId: "65536" }],
                _links: { next: "/wiki/api/v2/pages?cursor=next" }
            });

            const result = await executeListPages(mockClient, { limit: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Resource not found in Confluence"));

            const result = await executeListPages(mockClient, { spaceId: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Confluence");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce(undefined);

            const result = await executeListPages(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list pages");
        });
    });

    describe("executeGetPage", () => {
        it("calls client with correct URL when no body format", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "131072",
                title: "Getting Started",
                status: "current",
                spaceId: "65536"
            });

            await executeGetPage(mockClient, { pageId: "131072" });

            expect(mockClient.get).toHaveBeenCalledWith("/wiki/api/v2/pages/131072");
        });

        it("calls client with body format query param", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "131072",
                title: "Getting Started",
                status: "current",
                spaceId: "65536",
                body: { storage: { value: "<p>Content</p>", representation: "storage" } }
            });

            await executeGetPage(mockClient, { pageId: "131072", bodyFormat: "storage" });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/wiki/api/v2/pages/131072?body-format=storage"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                id: "131072",
                title: "Getting Started",
                status: "current",
                spaceId: "65536",
                parentId: undefined,
                body: {
                    storage: {
                        value: "<p>Welcome to the Getting Started guide.</p>",
                        representation: "storage"
                    }
                },
                version: { number: 3, createdAt: "2024-01-15T10:30:00Z" },
                _links: { webui: "/pages/131072", editui: "/pages/131072/edit" }
            });

            const result = await executeGetPage(mockClient, {
                pageId: "131072",
                bodyFormat: "storage"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "131072",
                title: "Getting Started",
                status: "current",
                spaceId: "65536",
                parentId: undefined,
                body: {
                    storage: {
                        value: "<p>Welcome to the Getting Started guide.</p>",
                        representation: "storage"
                    }
                },
                version: { number: 3, createdAt: "2024-01-15T10:30:00Z" },
                _links: { webui: "/pages/131072", editui: "/pages/131072/edit" }
            });
        });

        it("returns error when page not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Resource not found in Confluence"));

            const result = await executeGetPage(mockClient, { pageId: "999999" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Confluence");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce({ weird: "object" });

            const result = await executeGetPage(mockClient, { pageId: "131072" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get page");
        });
    });

    describe("executeCreatePage", () => {
        it("calls client with correct body for minimal params", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "131080",
                title: "New Page",
                status: "current",
                spaceId: "65536",
                version: { number: 1 }
            });

            await executeCreatePage(mockClient, {
                spaceId: "65536",
                title: "New Page",
                body: "<p>Content</p>"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/wiki/api/v2/pages", {
                spaceId: "65536",
                title: "New Page",
                body: {
                    representation: "storage",
                    value: "<p>Content</p>"
                }
            });
        });

        it("calls client with parentId when provided", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "131081",
                title: "Child Page",
                status: "current",
                spaceId: "65536",
                version: { number: 1 }
            });

            await executeCreatePage(mockClient, {
                spaceId: "65536",
                title: "Child Page",
                body: "<p>Child content</p>",
                parentId: "131072"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/wiki/api/v2/pages", {
                spaceId: "65536",
                title: "Child Page",
                body: {
                    representation: "storage",
                    value: "<p>Child content</p>"
                },
                parentId: "131072"
            });
        });

        it("calls client with status when provided", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "131082",
                title: "Draft Page",
                status: "draft",
                spaceId: "65536",
                version: { number: 1 }
            });

            await executeCreatePage(mockClient, {
                spaceId: "65536",
                title: "Draft Page",
                body: "<p>Draft content</p>",
                status: "draft"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/wiki/api/v2/pages", {
                spaceId: "65536",
                title: "Draft Page",
                body: {
                    representation: "storage",
                    value: "<p>Draft content</p>"
                },
                status: "draft"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({
                id: "131083",
                title: "New Feature Spec",
                status: "current",
                spaceId: "65536",
                version: { number: 1 },
                _links: { webui: "/pages/131083" }
            });

            const result = await executeCreatePage(mockClient, {
                spaceId: "65536",
                title: "New Feature Spec",
                body: "<p>Feature specification content</p>"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "131083",
                title: "New Feature Spec",
                status: "current",
                spaceId: "65536",
                version: { number: 1 },
                _links: { webui: "/pages/131083" }
            });
        });

        it("returns error on duplicate title", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("A page with this title already exists in the space")
            );

            const result = await executeCreatePage(mockClient, {
                spaceId: "65536",
                title: "Getting Started",
                body: "<p>Duplicate</p>"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "A page with this title already exists in the space"
            );
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.post.mockRejectedValueOnce(123);

            const result = await executeCreatePage(mockClient, {
                spaceId: "65536",
                title: "Test",
                body: "<p>Test</p>"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create page");
        });
    });

    describe("executeUpdatePage", () => {
        it("calls client with correct body", async () => {
            mockClient.put.mockResolvedValueOnce({
                id: "131072",
                title: "Updated Title",
                status: "current",
                spaceId: "65536",
                version: { number: 4 }
            });

            await executeUpdatePage(mockClient, {
                pageId: "131072",
                title: "Updated Title",
                body: "<p>Updated content</p>",
                version: 3
            });

            expect(mockClient.put).toHaveBeenCalledWith("/wiki/api/v2/pages/131072", {
                id: "131072",
                title: "Updated Title",
                body: {
                    representation: "storage",
                    value: "<p>Updated content</p>"
                },
                version: {
                    number: 4, // version + 1
                    message: "Updated via FlowMaestro"
                }
            });
        });

        it("calls client with status when provided", async () => {
            mockClient.put.mockResolvedValueOnce({
                id: "131072",
                title: "Draft Page",
                status: "draft",
                spaceId: "65536",
                version: { number: 2 }
            });

            await executeUpdatePage(mockClient, {
                pageId: "131072",
                title: "Draft Page",
                body: "<p>Draft content</p>",
                version: 1,
                status: "draft"
            });

            expect(mockClient.put).toHaveBeenCalledWith("/wiki/api/v2/pages/131072", {
                id: "131072",
                title: "Draft Page",
                body: {
                    representation: "storage",
                    value: "<p>Draft content</p>"
                },
                version: {
                    number: 2,
                    message: "Updated via FlowMaestro"
                },
                status: "draft"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.put.mockResolvedValueOnce({
                id: "131072",
                title: "Getting Started (Updated)",
                status: "current",
                spaceId: "65536",
                version: { number: 4 },
                _links: { webui: "/pages/131072" }
            });

            const result = await executeUpdatePage(mockClient, {
                pageId: "131072",
                title: "Getting Started (Updated)",
                body: "<p>Updated content</p>",
                version: 3
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "131072",
                title: "Getting Started (Updated)",
                status: "current",
                spaceId: "65536",
                version: { number: 4 },
                _links: { webui: "/pages/131072" }
            });
        });

        it("returns error on version conflict", async () => {
            mockClient.put.mockRejectedValueOnce(
                new Error("Version conflict - page has been modified")
            );

            const result = await executeUpdatePage(mockClient, {
                pageId: "131072",
                title: "Getting Started",
                body: "<p>Stale update</p>",
                version: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Version conflict - page has been modified");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.put.mockRejectedValueOnce(false);

            const result = await executeUpdatePage(mockClient, {
                pageId: "131072",
                title: "Test",
                body: "<p>Test</p>",
                version: 1
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update page");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeGetPageChildren", () => {
        it("calls client with correct URL when no params provided", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeGetPageChildren(mockClient, { pageId: "131072" });

            expect(mockClient.get).toHaveBeenCalledWith("/wiki/api/v2/pages/131072/children");
        });

        it("calls client with all query params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeGetPageChildren(mockClient, {
                pageId: "131072",
                limit: 10,
                cursor: "child_cursor"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/wiki/api/v2/pages/131072/children?limit=10&cursor=child_cursor"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [
                    {
                        id: "131074",
                        title: "Installation Guide",
                        status: "current",
                        spaceId: "65536",
                        childPosition: 0,
                        _links: { webui: "/pages/131074" }
                    },
                    {
                        id: "131075",
                        title: "Quick Start",
                        status: "current",
                        spaceId: "65536",
                        childPosition: 1
                    }
                ],
                _links: {}
            });

            const result = await executeGetPageChildren(mockClient, { pageId: "131072" });

            expect(result.success).toBe(true);
            expect(result.data?.children).toHaveLength(2);
            expect(result.data?.children[0]).toEqual({
                id: "131074",
                title: "Installation Guide",
                status: "current",
                spaceId: "65536",
                childPosition: 0,
                _links: { webui: "/pages/131074" }
            });
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns hasMore true when next link present", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [{ id: "1", title: "Child", status: "current", spaceId: "65536" }],
                _links: { next: "/wiki/api/v2/pages/131072/children?cursor=next" }
            });

            const result = await executeGetPageChildren(mockClient, { pageId: "131072", limit: 1 });

            expect(result.success).toBe(true);
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns error when parent page not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Resource not found in Confluence"));

            const result = await executeGetPageChildren(mockClient, { pageId: "999999" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Confluence");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce([]);

            const result = await executeGetPageChildren(mockClient, { pageId: "131072" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get page children");
        });
    });

    // ============================================================================
    // SEARCH OPERATIONS
    // ============================================================================

    describe("executeSearchContent", () => {
        it("calls client with URL-encoded query", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeSearchContent(mockClient, {
                query: "type = page AND title ~ architecture"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/wiki/api/v2/search?query=type%20%3D%20page%20AND%20title%20~%20architecture"
            );
        });

        it("calls client with all query params", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            await executeSearchContent(mockClient, {
                query: "architecture",
                limit: 20,
                cursor: "search_cursor"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/wiki/api/v2/search?query=architecture&limit=20&cursor=search_cursor"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [
                    {
                        content: {
                            id: "131073",
                            title: "Architecture Overview",
                            type: "page",
                            status: "current",
                            spaceId: "65536"
                        },
                        title: "Architecture Overview",
                        excerpt: "This document describes the system architecture...",
                        url: "/pages/131073"
                    },
                    {
                        content: {
                            id: "131080",
                            title: "API Architecture",
                            type: "page",
                            status: "current"
                        },
                        excerpt: "API layer architecture and design patterns..."
                    }
                ],
                _links: { next: "/wiki/api/v2/search?cursor=more" }
            });

            const result = await executeSearchContent(mockClient, { query: "architecture" });

            expect(result.success).toBe(true);
            expect(result.data?.results).toHaveLength(2);
            expect(result.data?.results[0]).toEqual({
                content: {
                    id: "131073",
                    title: "Architecture Overview",
                    type: "page",
                    status: "current",
                    spaceId: "65536"
                },
                title: "Architecture Overview",
                excerpt: "This document describes the system architecture...",
                url: "/pages/131073"
            });
            expect(result.data?.hasMore).toBe(true);
        });

        it("returns hasMore false when no next link", async () => {
            mockClient.get.mockResolvedValueOnce({
                results: [],
                _links: {}
            });

            const result = await executeSearchContent(mockClient, { query: "nonexistent" });

            expect(result.success).toBe(true);
            expect(result.data?.results).toHaveLength(0);
            expect(result.data?.hasMore).toBe(false);
        });

        it("returns error on invalid CQL query", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Invalid CQL query"));

            const result = await executeSearchContent(mockClient, { query: "type = AND" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Invalid CQL query");
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce(Symbol("weird"));

            const result = await executeSearchContent(mockClient, { query: "test" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to search content");
        });
    });

    // ============================================================================
    // SCHEMA VALIDATION
    // ============================================================================

    describe("schema validation", () => {
        describe("listSpacesInputSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listSpacesInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with limit", () => {
                const result = listSpacesInputSchema.safeParse({ limit: 50 });
                expect(result.success).toBe(true);
            });

            it("validates with cursor", () => {
                const result = listSpacesInputSchema.safeParse({ cursor: "abc123" });
                expect(result.success).toBe(true);
            });

            it("validates with type", () => {
                const result = listSpacesInputSchema.safeParse({ type: "global" });
                expect(result.success).toBe(true);
            });

            it("validates with type personal", () => {
                const result = listSpacesInputSchema.safeParse({ type: "personal" });
                expect(result.success).toBe(true);
            });

            it("rejects invalid type", () => {
                const result = listSpacesInputSchema.safeParse({ type: "invalid" });
                expect(result.success).toBe(false);
            });

            it("rejects limit below 1", () => {
                const result = listSpacesInputSchema.safeParse({ limit: 0 });
                expect(result.success).toBe(false);
            });

            it("rejects limit above 250", () => {
                const result = listSpacesInputSchema.safeParse({ limit: 251 });
                expect(result.success).toBe(false);
            });
        });

        describe("getSpaceInputSchema", () => {
            it("validates with spaceId", () => {
                const result = getSpaceInputSchema.safeParse({ spaceId: "65536" });
                expect(result.success).toBe(true);
            });

            it("rejects missing spaceId", () => {
                const result = getSpaceInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listPagesInputSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = listPagesInputSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with spaceId", () => {
                const result = listPagesInputSchema.safeParse({ spaceId: "65536" });
                expect(result.success).toBe(true);
            });

            it("validates with status current", () => {
                const result = listPagesInputSchema.safeParse({ status: "current" });
                expect(result.success).toBe(true);
            });

            it("validates with status draft", () => {
                const result = listPagesInputSchema.safeParse({ status: "draft" });
                expect(result.success).toBe(true);
            });

            it("validates with status archived", () => {
                const result = listPagesInputSchema.safeParse({ status: "archived" });
                expect(result.success).toBe(true);
            });

            it("rejects invalid status", () => {
                const result = listPagesInputSchema.safeParse({ status: "deleted" });
                expect(result.success).toBe(false);
            });

            it("rejects limit above 250", () => {
                const result = listPagesInputSchema.safeParse({ limit: 300 });
                expect(result.success).toBe(false);
            });
        });

        describe("getPageInputSchema", () => {
            it("validates with pageId only", () => {
                const result = getPageInputSchema.safeParse({ pageId: "131072" });
                expect(result.success).toBe(true);
            });

            it("validates with bodyFormat storage", () => {
                const result = getPageInputSchema.safeParse({
                    pageId: "131072",
                    bodyFormat: "storage"
                });
                expect(result.success).toBe(true);
            });

            it("validates with bodyFormat atlas_doc_format", () => {
                const result = getPageInputSchema.safeParse({
                    pageId: "131072",
                    bodyFormat: "atlas_doc_format"
                });
                expect(result.success).toBe(true);
            });

            it("validates with bodyFormat view", () => {
                const result = getPageInputSchema.safeParse({
                    pageId: "131072",
                    bodyFormat: "view"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid bodyFormat", () => {
                const result = getPageInputSchema.safeParse({
                    pageId: "131072",
                    bodyFormat: "html"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing pageId", () => {
                const result = getPageInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("createPageInputSchema", () => {
            it("validates minimal input", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    title: "New Page",
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(true);
            });

            it("validates with parentId", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    title: "Child Page",
                    body: "<p>Content</p>",
                    parentId: "131072"
                });
                expect(result.success).toBe(true);
            });

            it("validates with status draft", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    title: "Draft Page",
                    body: "<p>Content</p>",
                    status: "draft"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing spaceId", () => {
                const result = createPageInputSchema.safeParse({
                    title: "Page",
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing title", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing body", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    title: "Page"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty title", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    title: "",
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(false);
            });

            it("rejects title exceeding 255 characters", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    title: "a".repeat(256),
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid status", () => {
                const result = createPageInputSchema.safeParse({
                    spaceId: "65536",
                    title: "Page",
                    body: "<p>Content</p>",
                    status: "archived"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updatePageInputSchema", () => {
            it("validates minimal input", () => {
                const result = updatePageInputSchema.safeParse({
                    pageId: "131072",
                    title: "Updated Title",
                    body: "<p>Updated content</p>",
                    version: 3
                });
                expect(result.success).toBe(true);
            });

            it("validates with status", () => {
                const result = updatePageInputSchema.safeParse({
                    pageId: "131072",
                    title: "Updated Title",
                    body: "<p>Updated content</p>",
                    version: 3,
                    status: "draft"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing pageId", () => {
                const result = updatePageInputSchema.safeParse({
                    title: "Updated Title",
                    body: "<p>Content</p>",
                    version: 3
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing version", () => {
                const result = updatePageInputSchema.safeParse({
                    pageId: "131072",
                    title: "Updated Title",
                    body: "<p>Content</p>"
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-integer version", () => {
                const result = updatePageInputSchema.safeParse({
                    pageId: "131072",
                    title: "Updated Title",
                    body: "<p>Content</p>",
                    version: 3.5
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid status", () => {
                const result = updatePageInputSchema.safeParse({
                    pageId: "131072",
                    title: "Updated Title",
                    body: "<p>Content</p>",
                    version: 3,
                    status: "archived"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getPageChildrenInputSchema", () => {
            it("validates with pageId only", () => {
                const result = getPageChildrenInputSchema.safeParse({ pageId: "131072" });
                expect(result.success).toBe(true);
            });

            it("validates with limit", () => {
                const result = getPageChildrenInputSchema.safeParse({
                    pageId: "131072",
                    limit: 50
                });
                expect(result.success).toBe(true);
            });

            it("validates with cursor", () => {
                const result = getPageChildrenInputSchema.safeParse({
                    pageId: "131072",
                    cursor: "child_cursor"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing pageId", () => {
                const result = getPageChildrenInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects limit below 1", () => {
                const result = getPageChildrenInputSchema.safeParse({
                    pageId: "131072",
                    limit: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit above 250", () => {
                const result = getPageChildrenInputSchema.safeParse({
                    pageId: "131072",
                    limit: 251
                });
                expect(result.success).toBe(false);
            });
        });

        describe("searchContentInputSchema", () => {
            it("validates with query only", () => {
                const result = searchContentInputSchema.safeParse({ query: "architecture" });
                expect(result.success).toBe(true);
            });

            it("validates with limit", () => {
                const result = searchContentInputSchema.safeParse({
                    query: "architecture",
                    limit: 25
                });
                expect(result.success).toBe(true);
            });

            it("validates with cursor", () => {
                const result = searchContentInputSchema.safeParse({
                    query: "architecture",
                    cursor: "search_cursor"
                });
                expect(result.success).toBe(true);
            });

            it("validates CQL query", () => {
                const result = searchContentInputSchema.safeParse({
                    query: "type = page AND space = ENG"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing query", () => {
                const result = searchContentInputSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty query", () => {
                const result = searchContentInputSchema.safeParse({ query: "" });
                expect(result.success).toBe(false);
            });

            it("rejects limit below 1", () => {
                const result = searchContentInputSchema.safeParse({
                    query: "test",
                    limit: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit above 100", () => {
                const result = searchContentInputSchema.safeParse({
                    query: "test",
                    limit: 101
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
