/**
 * Contentful Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCreateEntry, createEntrySchema } from "../operations/createEntry";
import { executeGetEntry, getEntrySchema } from "../operations/getEntry";
import { executeListAssets, listAssetsSchema } from "../operations/listAssets";
import { executeListContentTypes, listContentTypesSchema } from "../operations/listContentTypes";
import { executeListEntries, listEntriesSchema } from "../operations/listEntries";
import { executeListSpaces, listSpacesSchema } from "../operations/listSpaces";
import { executePublishEntry, publishEntrySchema } from "../operations/publishEntry";
import { executeUpdateEntry, updateEntrySchema } from "../operations/updateEntry";
import type { ContentfulClient } from "../client/ContentfulClient";

// Mock ContentfulClient factory
function createMockContentfulClient(): jest.Mocked<ContentfulClient> {
    return {
        listSpaces: jest.fn(),
        listContentTypes: jest.fn(),
        listEntries: jest.fn(),
        getEntry: jest.fn(),
        createEntry: jest.fn(),
        updateEntry: jest.fn(),
        publishEntry: jest.fn(),
        unpublishEntry: jest.fn(),
        listAssets: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<ContentfulClient>;
}

describe("Contentful Operation Executors", () => {
    let mockClient: jest.Mocked<ContentfulClient>;

    beforeEach(() => {
        mockClient = createMockContentfulClient();
    });

    describe("executeListSpaces", () => {
        it("calls client listSpaces method", async () => {
            mockClient.listSpaces.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 2,
                skip: 0,
                limit: 25,
                items: [
                    {
                        sys: { type: "Space", id: "space1" },
                        name: "Marketing Website"
                    },
                    {
                        sys: { type: "Space", id: "space2" },
                        name: "Developer Docs"
                    }
                ]
            });

            await executeListSpaces(mockClient, {});

            expect(mockClient.listSpaces).toHaveBeenCalledTimes(1);
        });

        it("returns normalized output on success", async () => {
            mockClient.listSpaces.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 3,
                skip: 0,
                limit: 25,
                items: [
                    {
                        sys: { type: "Space", id: "cfexampleapi" },
                        name: "Marketing Website"
                    },
                    {
                        sys: { type: "Space", id: "cfspaceid2" },
                        name: "Developer Documentation"
                    },
                    {
                        sys: { type: "Space", id: "cfspaceid3" },
                        name: "Mobile App Content"
                    }
                ]
            });

            const result = await executeListSpaces(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                spaces: [
                    { id: "cfexampleapi", name: "Marketing Website" },
                    { id: "cfspaceid2", name: "Developer Documentation" },
                    { id: "cfspaceid3", name: "Mobile App Content" }
                ],
                total: 3
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listSpaces.mockRejectedValueOnce(
                new Error(
                    "Contentful authentication failed. Please check your Personal Access Token."
                )
            );

            const result = await executeListSpaces(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Contentful authentication failed. Please check your Personal Access Token."
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listSpaces.mockRejectedValueOnce("string error");

            const result = await executeListSpaces(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list spaces");
        });
    });

    describe("executeListContentTypes", () => {
        it("calls client with default environment", async () => {
            mockClient.listContentTypes.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 0,
                skip: 0,
                limit: 100,
                items: []
            });

            await executeListContentTypes(mockClient, { environmentId: "master" });

            expect(mockClient.listContentTypes).toHaveBeenCalledWith("master");
        });

        it("calls client with custom environment", async () => {
            mockClient.listContentTypes.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 0,
                skip: 0,
                limit: 100,
                items: []
            });

            await executeListContentTypes(mockClient, { environmentId: "staging" });

            expect(mockClient.listContentTypes).toHaveBeenCalledWith("staging");
        });

        it("returns normalized output on success", async () => {
            mockClient.listContentTypes.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 2,
                skip: 0,
                limit: 100,
                items: [
                    {
                        sys: { type: "ContentType", id: "blogPost" },
                        name: "Blog Post",
                        description: "A blog post with title, body, and metadata",
                        displayField: "title",
                        fields: [
                            {
                                id: "title",
                                name: "Title",
                                type: "Symbol",
                                required: true,
                                localized: true
                            },
                            {
                                id: "slug",
                                name: "Slug",
                                type: "Symbol",
                                required: true,
                                localized: false
                            }
                        ]
                    },
                    {
                        sys: { type: "ContentType", id: "author" },
                        name: "Author",
                        description: "Content author profile",
                        displayField: "name",
                        fields: [
                            {
                                id: "name",
                                name: "Name",
                                type: "Symbol",
                                required: true,
                                localized: false
                            }
                        ]
                    }
                ]
            });

            const result = await executeListContentTypes(mockClient, { environmentId: "master" });

            expect(result.success).toBe(true);
            expect(result.data?.contentTypes).toHaveLength(2);
            expect(result.data?.contentTypes[0]).toEqual({
                id: "blogPost",
                name: "Blog Post",
                description: "A blog post with title, body, and metadata",
                displayField: "title",
                fields: [
                    {
                        id: "title",
                        name: "Title",
                        type: "Symbol",
                        required: true,
                        localized: true
                    },
                    {
                        id: "slug",
                        name: "Slug",
                        type: "Symbol",
                        required: true,
                        localized: false
                    }
                ]
            });
            expect(result.data?.total).toBe(2);
        });

        it("returns error on client failure", async () => {
            mockClient.listContentTypes.mockRejectedValueOnce(
                new Error("Resource not found in Contentful.")
            );

            const result = await executeListContentTypes(mockClient, { environmentId: "master" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Contentful.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listContentTypes.mockRejectedValueOnce({ unexpected: true });

            const result = await executeListContentTypes(mockClient, { environmentId: "master" });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list content types");
        });
    });

    describe("executeListEntries", () => {
        it("calls client with correct params", async () => {
            mockClient.listEntries.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 0,
                skip: 0,
                limit: 100,
                items: []
            });

            await executeListEntries(mockClient, {
                contentType: "blogPost",
                limit: 10,
                skip: 5,
                environmentId: "master"
            });

            expect(mockClient.listEntries).toHaveBeenCalledWith(
                {
                    contentType: "blogPost",
                    limit: 10,
                    skip: 5
                },
                "master"
            );
        });

        it("calls client with default values", async () => {
            mockClient.listEntries.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 0,
                skip: 0,
                limit: 100,
                items: []
            });

            await executeListEntries(mockClient, {
                limit: 100,
                skip: 0,
                environmentId: "master"
            });

            expect(mockClient.listEntries).toHaveBeenCalledWith(
                {
                    contentType: undefined,
                    limit: 100,
                    skip: 0
                },
                "master"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.listEntries.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 2,
                skip: 0,
                limit: 10,
                items: [
                    {
                        sys: {
                            type: "Entry",
                            id: "5KsDBWseXY6QegucYAoacS",
                            version: 5,
                            createdAt: "2024-03-10T08:00:00.000Z",
                            updatedAt: "2024-03-15T10:30:00.000Z",
                            publishedAt: "2024-03-15T10:30:00.000Z",
                            contentType: {
                                sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                            }
                        },
                        fields: {
                            title: { "en-US": "Getting Started with Contentful" },
                            slug: { "en-US": "getting-started-contentful" }
                        }
                    },
                    {
                        sys: {
                            type: "Entry",
                            id: "6KsDBWseXY6QegucYAoacT",
                            version: 3,
                            createdAt: "2024-03-12T14:00:00.000Z",
                            updatedAt: "2024-03-18T09:00:00.000Z",
                            publishedAt: "2024-03-18T09:00:00.000Z",
                            contentType: {
                                sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                            }
                        },
                        fields: {
                            title: { "en-US": "Advanced Content Modeling" },
                            slug: { "en-US": "advanced-content-modeling" }
                        }
                    }
                ]
            });

            const result = await executeListEntries(mockClient, {
                contentType: "blogPost",
                limit: 10,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data?.entries).toHaveLength(2);
            expect(result.data?.entries[0]).toEqual({
                id: "5KsDBWseXY6QegucYAoacS",
                contentTypeId: "blogPost",
                version: 5,
                fields: {
                    title: { "en-US": "Getting Started with Contentful" },
                    slug: { "en-US": "getting-started-contentful" }
                },
                createdAt: "2024-03-10T08:00:00.000Z",
                updatedAt: "2024-03-15T10:30:00.000Z",
                publishedAt: "2024-03-15T10:30:00.000Z"
            });
            expect(result.data?.total).toBe(2);
            expect(result.data?.skip).toBe(0);
            expect(result.data?.limit).toBe(10);
        });

        it("returns error on client failure", async () => {
            mockClient.listEntries.mockRejectedValueOnce(
                new Error("The content type 'nonExistentType' does not exist")
            );

            const result = await executeListEntries(mockClient, {
                contentType: "nonExistentType",
                limit: 10,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("The content type 'nonExistentType' does not exist");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listEntries.mockRejectedValueOnce(undefined);

            const result = await executeListEntries(mockClient, {
                limit: 100,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list entries");
        });
    });

    describe("executeGetEntry", () => {
        it("calls client with correct params", async () => {
            mockClient.getEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 5
                },
                fields: {
                    title: { "en-US": "Test" }
                }
            });

            await executeGetEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                environmentId: "master"
            });

            expect(mockClient.getEntry).toHaveBeenCalledWith("5KsDBWseXY6QegucYAoacS", "master");
        });

        it("returns normalized output on success", async () => {
            mockClient.getEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 5,
                    createdAt: "2024-03-10T08:00:00.000Z",
                    updatedAt: "2024-03-15T10:30:00.000Z",
                    publishedAt: "2024-03-15T10:30:00.000Z",
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {
                    title: { "en-US": "Getting Started with Contentful" },
                    slug: { "en-US": "getting-started-contentful" },
                    body: {
                        "en-US": {
                            nodeType: "document",
                            content: [
                                {
                                    nodeType: "paragraph",
                                    content: [
                                        {
                                            nodeType: "text",
                                            value: "Welcome to our guide."
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            });

            const result = await executeGetEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "5KsDBWseXY6QegucYAoacS",
                contentTypeId: "blogPost",
                version: 5,
                fields: {
                    title: { "en-US": "Getting Started with Contentful" },
                    slug: { "en-US": "getting-started-contentful" },
                    body: {
                        "en-US": {
                            nodeType: "document",
                            content: [
                                {
                                    nodeType: "paragraph",
                                    content: [
                                        {
                                            nodeType: "text",
                                            value: "Welcome to our guide."
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                createdAt: "2024-03-10T08:00:00.000Z",
                updatedAt: "2024-03-15T10:30:00.000Z",
                publishedAt: "2024-03-15T10:30:00.000Z"
            });
        });

        it("handles entry without contentType", async () => {
            mockClient.getEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "test-id",
                    version: 1
                },
                fields: {}
            });

            const result = await executeGetEntry(mockClient, {
                entryId: "test-id",
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data?.contentTypeId).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getEntry.mockRejectedValueOnce(
                new Error("Resource not found in Contentful.")
            );

            const result = await executeGetEntry(mockClient, {
                entryId: "nonexistent-entry-id",
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Contentful.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getEntry.mockRejectedValueOnce(null);

            const result = await executeGetEntry(mockClient, {
                entryId: "test-id",
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get entry");
        });
    });

    describe("executeCreateEntry", () => {
        it("calls client with correct params", async () => {
            mockClient.createEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "new-entry-id",
                    version: 1,
                    createdAt: "2024-03-20T12:00:00.000Z",
                    updatedAt: "2024-03-20T12:00:00.000Z",
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {
                    title: { "en-US": "My New Blog Post" },
                    slug: { "en-US": "my-new-blog-post" }
                }
            });

            const fields = {
                title: { "en-US": "My New Blog Post" },
                slug: { "en-US": "my-new-blog-post" }
            };

            await executeCreateEntry(mockClient, {
                contentTypeId: "blogPost",
                fields,
                environmentId: "master"
            });

            expect(mockClient.createEntry).toHaveBeenCalledWith("blogPost", fields, "master");
        });

        it("returns normalized output on success", async () => {
            mockClient.createEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "7KsDBWseXY6QegucYAoacU",
                    version: 1,
                    createdAt: "2024-03-20T12:00:00.000Z",
                    updatedAt: "2024-03-20T12:00:00.000Z",
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {
                    title: { "en-US": "My New Blog Post" },
                    slug: { "en-US": "my-new-blog-post" }
                }
            });

            const result = await executeCreateEntry(mockClient, {
                contentTypeId: "blogPost",
                fields: {
                    title: { "en-US": "My New Blog Post" },
                    slug: { "en-US": "my-new-blog-post" }
                },
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "7KsDBWseXY6QegucYAoacU",
                contentTypeId: "blogPost",
                version: 1,
                fields: {
                    title: { "en-US": "My New Blog Post" },
                    slug: { "en-US": "my-new-blog-post" }
                },
                createdAt: "2024-03-20T12:00:00.000Z",
                updatedAt: "2024-03-20T12:00:00.000Z"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.createEntry.mockRejectedValueOnce(
                new Error("Resource not found in Contentful.")
            );

            const result = await executeCreateEntry(mockClient, {
                contentTypeId: "nonExistentType",
                fields: { title: { "en-US": "Test" } },
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Contentful.");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on validation failure", async () => {
            mockClient.createEntry.mockRejectedValueOnce(
                new Error("Contentful API error: Validation error")
            );

            const result = await executeCreateEntry(mockClient, {
                contentTypeId: "blogPost",
                fields: { slug: { "en-US": "missing-title" } },
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Contentful API error: Validation error");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.createEntry.mockRejectedValueOnce({ code: "UNKNOWN" });

            const result = await executeCreateEntry(mockClient, {
                contentTypeId: "blogPost",
                fields: { title: { "en-US": "Test" } },
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to create entry");
        });
    });

    describe("executeUpdateEntry", () => {
        it("calls client with correct params", async () => {
            mockClient.updateEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 6,
                    createdAt: "2024-03-10T08:00:00.000Z",
                    updatedAt: "2024-03-20T14:00:00.000Z",
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {
                    title: { "en-US": "Updated Title" }
                }
            });

            const fields = { title: { "en-US": "Updated Title" } };

            await executeUpdateEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 5,
                fields,
                environmentId: "master"
            });

            expect(mockClient.updateEntry).toHaveBeenCalledWith(
                "5KsDBWseXY6QegucYAoacS",
                5,
                fields,
                "master"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.updateEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 6,
                    createdAt: "2024-03-10T08:00:00.000Z",
                    updatedAt: "2024-03-20T14:00:00.000Z",
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {
                    title: { "en-US": "Updated: Getting Started with Contentful" },
                    slug: { "en-US": "getting-started-contentful" }
                }
            });

            const result = await executeUpdateEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 5,
                fields: {
                    title: { "en-US": "Updated: Getting Started with Contentful" },
                    slug: { "en-US": "getting-started-contentful" }
                },
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "5KsDBWseXY6QegucYAoacS",
                contentTypeId: "blogPost",
                version: 6,
                fields: {
                    title: { "en-US": "Updated: Getting Started with Contentful" },
                    slug: { "en-US": "getting-started-contentful" }
                },
                createdAt: "2024-03-10T08:00:00.000Z",
                updatedAt: "2024-03-20T14:00:00.000Z"
            });
        });

        it("returns error on version conflict", async () => {
            mockClient.updateEntry.mockRejectedValueOnce(
                new Error(
                    "Contentful version conflict. The entry has been modified since you last retrieved it."
                )
            );

            const result = await executeUpdateEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 3,
                fields: { title: { "en-US": "Stale Update" } },
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Contentful version conflict. The entry has been modified since you last retrieved it."
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on entry not found", async () => {
            mockClient.updateEntry.mockRejectedValueOnce(
                new Error("Resource not found in Contentful.")
            );

            const result = await executeUpdateEntry(mockClient, {
                entryId: "nonexistent-entry-id",
                version: 1,
                fields: { title: { "en-US": "Test" } },
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found in Contentful.");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.updateEntry.mockRejectedValueOnce(42);

            const result = await executeUpdateEntry(mockClient, {
                entryId: "test-id",
                version: 1,
                fields: { title: { "en-US": "Test" } },
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to update entry");
        });
    });

    describe("executePublishEntry", () => {
        it("calls publishEntry for publish action", async () => {
            mockClient.publishEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 7,
                    publishedAt: "2024-03-20T15:00:00.000Z",
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {}
            });

            await executePublishEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 6,
                action: "publish",
                environmentId: "master"
            });

            expect(mockClient.publishEntry).toHaveBeenCalledWith(
                "5KsDBWseXY6QegucYAoacS",
                6,
                "master"
            );
            expect(mockClient.unpublishEntry).not.toHaveBeenCalled();
        });

        it("calls unpublishEntry for unpublish action", async () => {
            mockClient.unpublishEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 8,
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {}
            });

            await executePublishEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 7,
                action: "unpublish",
                environmentId: "master"
            });

            expect(mockClient.unpublishEntry).toHaveBeenCalledWith(
                "5KsDBWseXY6QegucYAoacS",
                "master"
            );
            expect(mockClient.publishEntry).not.toHaveBeenCalled();
        });

        it("returns normalized output on publish success", async () => {
            mockClient.publishEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 7,
                    publishedAt: "2024-03-20T15:00:00.000Z",
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {}
            });

            const result = await executePublishEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 6,
                action: "publish",
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "5KsDBWseXY6QegucYAoacS",
                contentTypeId: "blogPost",
                version: 7,
                publishedAt: "2024-03-20T15:00:00.000Z",
                action: "publish"
            });
        });

        it("returns normalized output on unpublish success", async () => {
            mockClient.unpublishEntry.mockResolvedValueOnce({
                sys: {
                    type: "Entry",
                    id: "5KsDBWseXY6QegucYAoacS",
                    version: 8,
                    publishedAt: undefined,
                    contentType: {
                        sys: { type: "Link", linkType: "ContentType", id: "blogPost" }
                    }
                },
                fields: {}
            });

            const result = await executePublishEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 7,
                action: "unpublish",
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "5KsDBWseXY6QegucYAoacS",
                contentTypeId: "blogPost",
                version: 8,
                publishedAt: undefined,
                action: "unpublish"
            });
        });

        it("returns error on version conflict", async () => {
            mockClient.publishEntry.mockRejectedValueOnce(
                new Error(
                    "Contentful version conflict. The entry has been modified since you last retrieved it."
                )
            );

            const result = await executePublishEntry(mockClient, {
                entryId: "5KsDBWseXY6QegucYAoacS",
                version: 2,
                action: "publish",
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Contentful version conflict. The entry has been modified since you last retrieved it."
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on entry not found", async () => {
            mockClient.publishEntry.mockRejectedValueOnce(
                new Error("Resource not found in Contentful.")
            );

            const result = await executePublishEntry(mockClient, {
                entryId: "nonexistent-entry-id",
                version: 1,
                action: "publish",
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Resource not found in Contentful.");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully for publish", async () => {
            mockClient.publishEntry.mockRejectedValueOnce([]);

            const result = await executePublishEntry(mockClient, {
                entryId: "test-id",
                version: 1,
                action: "publish",
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to publish entry");
        });

        it("handles unknown errors gracefully for unpublish", async () => {
            mockClient.unpublishEntry.mockRejectedValueOnce([]);

            const result = await executePublishEntry(mockClient, {
                entryId: "test-id",
                version: 1,
                action: "unpublish",
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to unpublish entry");
        });
    });

    describe("executeListAssets", () => {
        it("calls client with correct params", async () => {
            mockClient.listAssets.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 0,
                skip: 0,
                limit: 10,
                items: []
            });

            await executeListAssets(mockClient, {
                limit: 10,
                skip: 5,
                environmentId: "master"
            });

            expect(mockClient.listAssets).toHaveBeenCalledWith({ limit: 10, skip: 5 }, "master");
        });

        it("calls client with default values", async () => {
            mockClient.listAssets.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 0,
                skip: 0,
                limit: 100,
                items: []
            });

            await executeListAssets(mockClient, {
                limit: 100,
                skip: 0,
                environmentId: "master"
            });

            expect(mockClient.listAssets).toHaveBeenCalledWith({ limit: 100, skip: 0 }, "master");
        });

        it("returns normalized output on success", async () => {
            mockClient.listAssets.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 3,
                skip: 0,
                limit: 10,
                items: [
                    {
                        sys: {
                            type: "Asset",
                            id: "3wtvPBGKkMUEGIgegeaqW2",
                            createdAt: "2024-03-01T08:00:00.000Z",
                            updatedAt: "2024-03-01T08:00:00.000Z"
                        },
                        fields: {
                            title: { "en-US": "Hero Banner" },
                            description: { "en-US": "Homepage hero banner image" },
                            file: {
                                "en-US": {
                                    url: "//images.ctfassets.net/cfexampleapi/hero-banner.jpg",
                                    fileName: "hero-banner.jpg",
                                    contentType: "image/jpeg",
                                    details: {
                                        size: 245760,
                                        image: { width: 1920, height: 1080 }
                                    }
                                }
                            }
                        }
                    },
                    {
                        sys: {
                            type: "Asset",
                            id: "4xtvPBGKkMUEGIgegeaqW3",
                            createdAt: "2024-03-05T10:00:00.000Z",
                            updatedAt: "2024-03-05T10:00:00.000Z"
                        },
                        fields: {
                            title: { "en-US": "Team Photo" },
                            description: { "en-US": "Company team photograph" },
                            file: {
                                "en-US": {
                                    url: "//images.ctfassets.net/cfexampleapi/team-photo.png",
                                    fileName: "team-photo.png",
                                    contentType: "image/png",
                                    details: {
                                        size: 512000,
                                        image: { width: 2400, height: 1600 }
                                    }
                                }
                            }
                        }
                    },
                    {
                        sys: {
                            type: "Asset",
                            id: "5ytvPBGKkMUEGIgegeaqW4",
                            createdAt: "2024-03-10T14:00:00.000Z",
                            updatedAt: "2024-03-10T14:00:00.000Z"
                        },
                        fields: {
                            title: { "en-US": "Product Screenshot" },
                            description: { "en-US": "Dashboard product screenshot" },
                            file: {
                                "en-US": {
                                    url: "//images.ctfassets.net/cfexampleapi/product-screenshot.png",
                                    fileName: "product-screenshot.png",
                                    contentType: "image/png",
                                    details: {
                                        size: 389120,
                                        image: { width: 1440, height: 900 }
                                    }
                                }
                            }
                        }
                    }
                ]
            });

            const result = await executeListAssets(mockClient, {
                limit: 10,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data?.assets).toHaveLength(3);
            expect(result.data?.assets[0]).toEqual({
                id: "3wtvPBGKkMUEGIgegeaqW2",
                title: "Hero Banner",
                description: "Homepage hero banner image",
                fileName: "hero-banner.jpg",
                contentType: "image/jpeg",
                url: "https://images.ctfassets.net/cfexampleapi/hero-banner.jpg",
                size: 245760,
                width: 1920,
                height: 1080,
                createdAt: "2024-03-01T08:00:00.000Z",
                updatedAt: "2024-03-01T08:00:00.000Z"
            });
            expect(result.data?.total).toBe(3);
            expect(result.data?.skip).toBe(0);
            expect(result.data?.limit).toBe(10);
        });

        it("handles assets without file details", async () => {
            mockClient.listAssets.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 1,
                skip: 0,
                limit: 10,
                items: [
                    {
                        sys: {
                            type: "Asset",
                            id: "asset-without-file",
                            createdAt: "2024-03-01T08:00:00.000Z",
                            updatedAt: "2024-03-01T08:00:00.000Z"
                        },
                        fields: {
                            title: { "en-US": "Draft Asset" }
                        }
                    }
                ]
            });

            const result = await executeListAssets(mockClient, {
                limit: 10,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data?.assets[0]).toEqual({
                id: "asset-without-file",
                title: "Draft Asset",
                description: undefined,
                fileName: undefined,
                contentType: undefined,
                url: undefined,
                size: undefined,
                width: undefined,
                height: undefined,
                createdAt: "2024-03-01T08:00:00.000Z",
                updatedAt: "2024-03-01T08:00:00.000Z"
            });
        });

        it("handles assets without image dimensions (e.g., documents)", async () => {
            mockClient.listAssets.mockResolvedValueOnce({
                sys: { type: "Array" },
                total: 1,
                skip: 0,
                limit: 10,
                items: [
                    {
                        sys: {
                            type: "Asset",
                            id: "pdf-asset",
                            createdAt: "2024-03-01T08:00:00.000Z",
                            updatedAt: "2024-03-01T08:00:00.000Z"
                        },
                        fields: {
                            title: { "en-US": "Document PDF" },
                            file: {
                                "en-US": {
                                    url: "//assets.ctfassets.net/document.pdf",
                                    fileName: "document.pdf",
                                    contentType: "application/pdf",
                                    details: {
                                        size: 102400
                                    }
                                }
                            }
                        }
                    }
                ]
            });

            const result = await executeListAssets(mockClient, {
                limit: 10,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(true);
            expect(result.data?.assets[0]).toEqual({
                id: "pdf-asset",
                title: "Document PDF",
                description: undefined,
                fileName: "document.pdf",
                contentType: "application/pdf",
                url: "https://assets.ctfassets.net/document.pdf",
                size: 102400,
                width: undefined,
                height: undefined,
                createdAt: "2024-03-01T08:00:00.000Z",
                updatedAt: "2024-03-01T08:00:00.000Z"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listAssets.mockRejectedValueOnce(
                new Error("Resource not found in Contentful.")
            );

            const result = await executeListAssets(mockClient, {
                limit: 10,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Resource not found in Contentful.");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listAssets.mockRejectedValueOnce(new Set());

            const result = await executeListAssets(mockClient, {
                limit: 100,
                skip: 0,
                environmentId: "master"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list assets");
        });
    });

    describe("schema validation", () => {
        describe("listSpacesSchema", () => {
            it("validates empty input", () => {
                const result = listSpacesSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("listContentTypesSchema", () => {
            it("validates empty input (uses default)", () => {
                const result = listContentTypesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates with custom environment", () => {
                const result = listContentTypesSchema.safeParse({
                    environmentId: "staging"
                });
                expect(result.success).toBe(true);
            });

            it("applies default environmentId", () => {
                const result = listContentTypesSchema.parse({});
                expect(result.environmentId).toBe("master");
            });
        });

        describe("listEntriesSchema", () => {
            it("validates minimal input", () => {
                const result = listEntriesSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listEntriesSchema.safeParse({
                    contentType: "blogPost",
                    limit: 50,
                    skip: 10,
                    environmentId: "staging"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid limit (too high)", () => {
                const result = listEntriesSchema.safeParse({
                    limit: 2000
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid limit (too low)", () => {
                const result = listEntriesSchema.safeParse({
                    limit: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative skip", () => {
                const result = listEntriesSchema.safeParse({
                    skip: -1
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listEntriesSchema.parse({});
                expect(result.limit).toBe(100);
                expect(result.skip).toBe(0);
                expect(result.environmentId).toBe("master");
            });
        });

        describe("getEntrySchema", () => {
            it("validates minimal input", () => {
                const result = getEntrySchema.safeParse({
                    entryId: "5KsDBWseXY6QegucYAoacS"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = getEntrySchema.safeParse({
                    entryId: "5KsDBWseXY6QegucYAoacS",
                    environmentId: "staging"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing entryId", () => {
                const result = getEntrySchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty entryId", () => {
                const result = getEntrySchema.safeParse({
                    entryId: ""
                });
                expect(result.success).toBe(false);
            });

            it("applies default environmentId", () => {
                const result = getEntrySchema.parse({
                    entryId: "test-id"
                });
                expect(result.environmentId).toBe("master");
            });
        });

        describe("createEntrySchema", () => {
            it("validates minimal input", () => {
                const result = createEntrySchema.safeParse({
                    contentTypeId: "blogPost",
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createEntrySchema.safeParse({
                    contentTypeId: "blogPost",
                    fields: {
                        title: { "en-US": "Test" },
                        slug: { "en-US": "test-slug" }
                    },
                    environmentId: "staging"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing contentTypeId", () => {
                const result = createEntrySchema.safeParse({
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty contentTypeId", () => {
                const result = createEntrySchema.safeParse({
                    contentTypeId: "",
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing fields", () => {
                const result = createEntrySchema.safeParse({
                    contentTypeId: "blogPost"
                });
                expect(result.success).toBe(false);
            });

            it("applies default environmentId", () => {
                const result = createEntrySchema.parse({
                    contentTypeId: "blogPost",
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.environmentId).toBe("master");
            });
        });

        describe("updateEntrySchema", () => {
            it("validates minimal input", () => {
                const result = updateEntrySchema.safeParse({
                    entryId: "test-id",
                    version: 1,
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = updateEntrySchema.safeParse({
                    entryId: "test-id",
                    version: 5,
                    fields: { title: { "en-US": "Updated" } },
                    environmentId: "staging"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing entryId", () => {
                const result = updateEntrySchema.safeParse({
                    version: 1,
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing version", () => {
                const result = updateEntrySchema.safeParse({
                    entryId: "test-id",
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid version (zero)", () => {
                const result = updateEntrySchema.safeParse({
                    entryId: "test-id",
                    version: 0,
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative version", () => {
                const result = updateEntrySchema.safeParse({
                    entryId: "test-id",
                    version: -1,
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.success).toBe(false);
            });

            it("applies default environmentId", () => {
                const result = updateEntrySchema.parse({
                    entryId: "test-id",
                    version: 1,
                    fields: { title: { "en-US": "Test" } }
                });
                expect(result.environmentId).toBe("master");
            });
        });

        describe("publishEntrySchema", () => {
            it("validates minimal input", () => {
                const result = publishEntrySchema.safeParse({
                    entryId: "test-id",
                    version: 1
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with publish action", () => {
                const result = publishEntrySchema.safeParse({
                    entryId: "test-id",
                    version: 5,
                    action: "publish",
                    environmentId: "staging"
                });
                expect(result.success).toBe(true);
            });

            it("validates with unpublish action", () => {
                const result = publishEntrySchema.safeParse({
                    entryId: "test-id",
                    version: 5,
                    action: "unpublish"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid action", () => {
                const result = publishEntrySchema.safeParse({
                    entryId: "test-id",
                    version: 1,
                    action: "draft"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing entryId", () => {
                const result = publishEntrySchema.safeParse({
                    version: 1
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing version", () => {
                const result = publishEntrySchema.safeParse({
                    entryId: "test-id"
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = publishEntrySchema.parse({
                    entryId: "test-id",
                    version: 1
                });
                expect(result.action).toBe("publish");
                expect(result.environmentId).toBe("master");
            });
        });

        describe("listAssetsSchema", () => {
            it("validates empty input", () => {
                const result = listAssetsSchema.safeParse({});
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = listAssetsSchema.safeParse({
                    limit: 50,
                    skip: 25,
                    environmentId: "staging"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid limit (too high)", () => {
                const result = listAssetsSchema.safeParse({
                    limit: 1001
                });
                expect(result.success).toBe(false);
            });

            it("rejects invalid limit (too low)", () => {
                const result = listAssetsSchema.safeParse({
                    limit: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative skip", () => {
                const result = listAssetsSchema.safeParse({
                    skip: -5
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listAssetsSchema.parse({});
                expect(result.limit).toBe(100);
                expect(result.skip).toBe(0);
                expect(result.environmentId).toBe("master");
            });
        });
    });
});
