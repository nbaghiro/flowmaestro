/**
 * Notion Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreatePage, createPageSchema } from "../operations/createPage";
import { executeGetPage, getPageSchema } from "../operations/getPage";
import { executeQueryDatabase, queryDatabaseSchema } from "../operations/queryDatabase";
import { executeSearch, searchSchema } from "../operations/search";
import { executeUpdatePage, updatePageSchema } from "../operations/updatePage";
import type { NotionClient } from "../client/NotionClient";

// Mock NotionClient factory
function createMockNotionClient(): jest.Mocked<NotionClient> {
    return {
        createPage: jest.fn(),
        getPage: jest.fn(),
        updatePage: jest.fn(),
        queryDatabase: jest.fn(),
        getDatabase: jest.fn(),
        search: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<NotionClient>;
}

describe("Notion Operation Executors", () => {
    let mockClient: jest.Mocked<NotionClient>;

    beforeEach(() => {
        mockClient = createMockNotionClient();
    });

    describe("executeCreatePage", () => {
        it("calls client with correct params for page parent", async () => {
            mockClient.createPage.mockResolvedValueOnce({
                object: "page",
                id: "page-123",
                url: "https://notion.so/page-123"
            });

            await executeCreatePage(mockClient, {
                parent_id: "parent-page-id",
                parent_type: "page_id",
                title: "Test Page"
            });

            expect(mockClient.createPage).toHaveBeenCalledWith({
                parent: { page_id: "parent-page-id" },
                properties: {
                    title: {
                        title: [
                            {
                                text: {
                                    content: "Test Page"
                                }
                            }
                        ]
                    }
                },
                children: undefined
            });
        });

        it("calls client with correct params for database parent", async () => {
            mockClient.createPage.mockResolvedValueOnce({
                object: "page",
                id: "page-456",
                url: "https://notion.so/page-456"
            });

            await executeCreatePage(mockClient, {
                parent_id: "database-id",
                parent_type: "database_id",
                title: "Database Entry"
            });

            expect(mockClient.createPage).toHaveBeenCalledWith({
                parent: { database_id: "database-id" },
                properties: {
                    Name: {
                        title: [
                            {
                                text: {
                                    content: "Database Entry"
                                }
                            }
                        ]
                    }
                },
                children: undefined
            });
        });

        it("preserves existing properties when creating database page", async () => {
            mockClient.createPage.mockResolvedValueOnce({
                object: "page",
                id: "page-789"
            });

            await executeCreatePage(mockClient, {
                parent_id: "database-id",
                parent_type: "database_id",
                title: "Entry with Props",
                properties: {
                    Status: { select: { name: "In Progress" } }
                }
            });

            expect(mockClient.createPage).toHaveBeenCalledWith({
                parent: { database_id: "database-id" },
                properties: {
                    Status: { select: { name: "In Progress" } },
                    Name: {
                        title: [
                            {
                                text: {
                                    content: "Entry with Props"
                                }
                            }
                        ]
                    }
                },
                children: undefined
            });
        });

        it("does not override existing Name property", async () => {
            mockClient.createPage.mockResolvedValueOnce({
                object: "page",
                id: "page-101"
            });

            await executeCreatePage(mockClient, {
                parent_id: "database-id",
                parent_type: "database_id",
                title: "Ignored Title",
                properties: {
                    Name: { title: [{ text: { content: "Custom Name" } }] }
                }
            });

            expect(mockClient.createPage).toHaveBeenCalledWith({
                parent: { database_id: "database-id" },
                properties: {
                    Name: { title: [{ text: { content: "Custom Name" } }] }
                },
                children: undefined
            });
        });

        it("passes children blocks when provided", async () => {
            const children = [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{ text: { content: "Hello World" } }]
                    }
                }
            ];

            mockClient.createPage.mockResolvedValueOnce({
                object: "page",
                id: "page-with-content"
            });

            await executeCreatePage(mockClient, {
                parent_id: "parent-page-id",
                parent_type: "page_id",
                title: "Page with Content",
                children
            });

            expect(mockClient.createPage).toHaveBeenCalledWith({
                parent: { page_id: "parent-page-id" },
                properties: {
                    title: {
                        title: [
                            {
                                text: {
                                    content: "Page with Content"
                                }
                            }
                        ]
                    }
                },
                children
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                object: "page",
                id: "page-123",
                url: "https://notion.so/page-123",
                created_time: "2024-01-01T00:00:00.000Z"
            };

            mockClient.createPage.mockResolvedValueOnce(mockResponse);

            const result = await executeCreatePage(mockClient, {
                parent_id: "parent-id",
                parent_type: "page_id",
                title: "Test"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.createPage.mockRejectedValueOnce(
                new Error("validation_error: Invalid parent")
            );

            const result = await executeCreatePage(mockClient, {
                parent_id: "invalid-parent",
                parent_type: "page_id",
                title: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("validation_error: Invalid parent");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createPage.mockRejectedValueOnce("string error");

            const result = await executeCreatePage(mockClient, {
                parent_id: "parent-id",
                parent_type: "page_id",
                title: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create Notion page");
        });
    });

    describe("executeGetPage", () => {
        it("calls client with correct params", async () => {
            mockClient.getPage.mockResolvedValueOnce({
                object: "page",
                id: "page-123"
            });

            await executeGetPage(mockClient, {
                page_id: "page-123"
            });

            expect(mockClient.getPage).toHaveBeenCalledWith("page-123");
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                object: "page",
                id: "page-123",
                properties: {
                    title: {
                        title: [{ text: { content: "My Page" } }]
                    }
                },
                url: "https://notion.so/page-123"
            };

            mockClient.getPage.mockResolvedValueOnce(mockResponse);

            const result = await executeGetPage(mockClient, {
                page_id: "page-123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.getPage.mockRejectedValueOnce(new Error("object_not_found"));

            const result = await executeGetPage(mockClient, {
                page_id: "nonexistent-page"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("object_not_found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getPage.mockRejectedValueOnce({ code: "unknown" });

            const result = await executeGetPage(mockClient, {
                page_id: "page-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get Notion page");
        });
    });

    describe("executeQueryDatabase", () => {
        it("calls client with minimal params", async () => {
            mockClient.queryDatabase.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeQueryDatabase(mockClient, {
                database_id: "db-123"
            });

            expect(mockClient.queryDatabase).toHaveBeenCalledWith("db-123", {
                filter: undefined,
                sorts: undefined,
                page_size: undefined
            });
        });

        it("calls client with filter params", async () => {
            const filter = {
                property: "Status",
                select: { equals: "Done" }
            };

            mockClient.queryDatabase.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeQueryDatabase(mockClient, {
                database_id: "db-123",
                filter
            });

            expect(mockClient.queryDatabase).toHaveBeenCalledWith("db-123", {
                filter,
                sorts: undefined,
                page_size: undefined
            });
        });

        it("calls client with sorts params", async () => {
            const sorts = [{ property: "Created", direction: "descending" }];

            mockClient.queryDatabase.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeQueryDatabase(mockClient, {
                database_id: "db-123",
                sorts
            });

            expect(mockClient.queryDatabase).toHaveBeenCalledWith("db-123", {
                filter: undefined,
                sorts,
                page_size: undefined
            });
        });

        it("calls client with page_size param", async () => {
            mockClient.queryDatabase.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeQueryDatabase(mockClient, {
                database_id: "db-123",
                page_size: 50
            });

            expect(mockClient.queryDatabase).toHaveBeenCalledWith("db-123", {
                filter: undefined,
                sorts: undefined,
                page_size: 50
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                object: "list",
                results: [
                    { object: "page", id: "page-1" },
                    { object: "page", id: "page-2" }
                ],
                has_more: true,
                next_cursor: "cursor-abc"
            };

            mockClient.queryDatabase.mockResolvedValueOnce(mockResponse);

            const result = await executeQueryDatabase(mockClient, {
                database_id: "db-123"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.queryDatabase.mockRejectedValueOnce(new Error("restricted_resource"));

            const result = await executeQueryDatabase(mockClient, {
                database_id: "restricted-db"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("restricted_resource");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.queryDatabase.mockRejectedValueOnce(null);

            const result = await executeQueryDatabase(mockClient, {
                database_id: "db-123"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to query Notion database");
        });
    });

    describe("executeSearch", () => {
        it("calls client with empty params", async () => {
            mockClient.search.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeSearch(mockClient, {});

            expect(mockClient.search).toHaveBeenCalledWith({
                query: undefined,
                filter: undefined,
                page_size: undefined
            });
        });

        it("calls client with query param", async () => {
            mockClient.search.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeSearch(mockClient, {
                query: "meeting notes"
            });

            expect(mockClient.search).toHaveBeenCalledWith({
                query: "meeting notes",
                filter: undefined,
                page_size: undefined
            });
        });

        it("calls client with page filter", async () => {
            mockClient.search.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeSearch(mockClient, {
                filter: { value: "page", property: "object" }
            });

            expect(mockClient.search).toHaveBeenCalledWith({
                query: undefined,
                filter: { value: "page", property: "object" },
                page_size: undefined
            });
        });

        it("calls client with database filter", async () => {
            mockClient.search.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeSearch(mockClient, {
                filter: { value: "database", property: "object" }
            });

            expect(mockClient.search).toHaveBeenCalledWith({
                query: undefined,
                filter: { value: "database", property: "object" },
                page_size: undefined
            });
        });

        it("calls client with page_size param", async () => {
            mockClient.search.mockResolvedValueOnce({
                object: "list",
                results: [],
                has_more: false
            });

            await executeSearch(mockClient, {
                page_size: 25
            });

            expect(mockClient.search).toHaveBeenCalledWith({
                query: undefined,
                filter: undefined,
                page_size: 25
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                object: "list",
                results: [
                    { object: "page", id: "page-1", title: "Meeting Notes" },
                    { object: "database", id: "db-1", title: "Tasks" }
                ],
                has_more: false,
                next_cursor: null
            };

            mockClient.search.mockResolvedValueOnce(mockResponse);

            const result = await executeSearch(mockClient, {
                query: "notes"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.search.mockRejectedValueOnce(new Error("unauthorized"));

            const result = await executeSearch(mockClient, {
                query: "test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("unauthorized");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.search.mockRejectedValueOnce(undefined);

            const result = await executeSearch(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to search Notion");
        });
    });

    describe("executeUpdatePage", () => {
        it("calls client with properties update", async () => {
            mockClient.updatePage.mockResolvedValueOnce({
                object: "page",
                id: "page-123"
            });

            await executeUpdatePage(mockClient, {
                page_id: "page-123",
                properties: {
                    Status: { select: { name: "Done" } }
                }
            });

            expect(mockClient.updatePage).toHaveBeenCalledWith("page-123", {
                properties: {
                    Status: { select: { name: "Done" } }
                },
                archived: undefined
            });
        });

        it("calls client with archived flag", async () => {
            mockClient.updatePage.mockResolvedValueOnce({
                object: "page",
                id: "page-123",
                archived: true
            });

            await executeUpdatePage(mockClient, {
                page_id: "page-123",
                properties: {},
                archived: true
            });

            expect(mockClient.updatePage).toHaveBeenCalledWith("page-123", {
                properties: {},
                archived: true
            });
        });

        it("calls client with both properties and archived", async () => {
            mockClient.updatePage.mockResolvedValueOnce({
                object: "page",
                id: "page-123"
            });

            await executeUpdatePage(mockClient, {
                page_id: "page-123",
                properties: {
                    Name: { title: [{ text: { content: "Updated Title" } }] }
                },
                archived: false
            });

            expect(mockClient.updatePage).toHaveBeenCalledWith("page-123", {
                properties: {
                    Name: { title: [{ text: { content: "Updated Title" } }] }
                },
                archived: false
            });
        });

        it("returns normalized output on success", async () => {
            const mockResponse = {
                object: "page",
                id: "page-123",
                last_edited_time: "2024-01-15T10:30:00.000Z",
                properties: {
                    Status: { select: { name: "Done" } }
                }
            };

            mockClient.updatePage.mockResolvedValueOnce(mockResponse);

            const result = await executeUpdatePage(mockClient, {
                page_id: "page-123",
                properties: {
                    Status: { select: { name: "Done" } }
                }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockResponse);
        });

        it("returns error on client failure", async () => {
            mockClient.updatePage.mockRejectedValueOnce(new Error("object_not_found"));

            const result = await executeUpdatePage(mockClient, {
                page_id: "nonexistent-page",
                properties: {}
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("object_not_found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.updatePage.mockRejectedValueOnce(42);

            const result = await executeUpdatePage(mockClient, {
                page_id: "page-123",
                properties: {}
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update Notion page");
        });
    });

    describe("schema validation", () => {
        describe("createPageSchema", () => {
            it("validates minimal input", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "parent-123",
                    parent_type: "page_id",
                    title: "My Page"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with page parent", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "parent-123",
                    parent_type: "page_id",
                    title: "My Page",
                    children: [{ type: "paragraph" }]
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with database parent", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "db-123",
                    parent_type: "database_id",
                    title: "Database Entry",
                    properties: {
                        Status: { select: { name: "Todo" } }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing parent_id", () => {
                const result = createPageSchema.safeParse({
                    parent_type: "page_id",
                    title: "My Page"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty parent_id", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "",
                    parent_type: "page_id",
                    title: "My Page"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing parent_type", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "parent-123",
                    title: "My Page"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid parent_type", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "parent-123",
                    parent_type: "workspace",
                    title: "My Page"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing title", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "parent-123",
                    parent_type: "page_id"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty title", () => {
                const result = createPageSchema.safeParse({
                    parent_id: "parent-123",
                    parent_type: "page_id",
                    title: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getPageSchema", () => {
            it("validates valid input", () => {
                const result = getPageSchema.safeParse({
                    page_id: "page-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing page_id", () => {
                const result = getPageSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty page_id", () => {
                const result = getPageSchema.safeParse({
                    page_id: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("queryDatabaseSchema", () => {
            it("validates minimal input", () => {
                const result = queryDatabaseSchema.safeParse({
                    database_id: "db-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = queryDatabaseSchema.safeParse({
                    database_id: "db-123",
                    filter: { property: "Status", select: { equals: "Done" } },
                    sorts: [{ property: "Created", direction: "descending" }],
                    page_size: 50
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing database_id", () => {
                const result = queryDatabaseSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty database_id", () => {
                const result = queryDatabaseSchema.safeParse({
                    database_id: ""
                });
                expect(result.success).toBe(false);
            });

            it("rejects page_size below 1", () => {
                const result = queryDatabaseSchema.safeParse({
                    database_id: "db-123",
                    page_size: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects page_size above 100", () => {
                const result = queryDatabaseSchema.safeParse({
                    database_id: "db-123",
                    page_size: 101
                });
                expect(result.success).toBe(false);
            });

            it("accepts page_size at boundary values", () => {
                const result1 = queryDatabaseSchema.safeParse({
                    database_id: "db-123",
                    page_size: 1
                });
                expect(result1.success).toBe(true);

                const result100 = queryDatabaseSchema.safeParse({
                    database_id: "db-123",
                    page_size: 100
                });
                expect(result100.success).toBe(true);
            });
        });

        describe("searchSchema", () => {
            it("validates empty input (all optional)", () => {
                const result = searchSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with query only", () => {
                const result = searchSchema.safeParse({
                    query: "meeting notes"
                });
                expect(result.success).toBe(true);
            });

            it("validates with page filter", () => {
                const result = searchSchema.safeParse({
                    filter: { value: "page", property: "object" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with database filter", () => {
                const result = searchSchema.safeParse({
                    filter: { value: "database", property: "object" }
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = searchSchema.safeParse({
                    query: "tasks",
                    filter: { value: "database", property: "object" },
                    page_size: 10
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid filter value", () => {
                const result = searchSchema.safeParse({
                    filter: { value: "block", property: "object" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid filter property", () => {
                const result = searchSchema.safeParse({
                    filter: { value: "page", property: "type" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects page_size below 1", () => {
                const result = searchSchema.safeParse({
                    page_size: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects page_size above 100", () => {
                const result = searchSchema.safeParse({
                    page_size: 150
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updatePageSchema", () => {
            it("validates minimal input", () => {
                const result = updatePageSchema.safeParse({
                    page_id: "page-123",
                    properties: {}
                });
                expect(result.success).toBe(true);
            });

            it("validates with properties", () => {
                const result = updatePageSchema.safeParse({
                    page_id: "page-123",
                    properties: {
                        Status: { select: { name: "Done" } },
                        Priority: { select: { name: "High" } }
                    }
                });
                expect(result.success).toBe(true);
            });

            it("validates with archived flag", () => {
                const result = updatePageSchema.safeParse({
                    page_id: "page-123",
                    properties: {},
                    archived: true
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updatePageSchema.safeParse({
                    page_id: "page-123",
                    properties: {
                        Name: { title: [{ text: { content: "Updated" } }] }
                    },
                    archived: false
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing page_id", () => {
                const result = updatePageSchema.safeParse({
                    properties: {}
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty page_id", () => {
                const result = updatePageSchema.safeParse({
                    page_id: "",
                    properties: {}
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing properties", () => {
                const result = updatePageSchema.safeParse({
                    page_id: "page-123"
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid archived type", () => {
                const result = updatePageSchema.safeParse({
                    page_id: "page-123",
                    properties: {},
                    archived: "yes"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
