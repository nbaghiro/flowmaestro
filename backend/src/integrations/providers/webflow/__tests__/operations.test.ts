/**
 * Webflow Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import {
    executeCreateCollectionItem,
    createCollectionItemSchema
} from "../operations/createCollectionItem";
import {
    executeDeleteCollectionItem,
    deleteCollectionItemSchema
} from "../operations/deleteCollectionItem";
import { executeGetCollection, getCollectionSchema } from "../operations/getCollection";
import { executeGetCollectionItem, getCollectionItemSchema } from "../operations/getCollectionItem";
import { executeGetSite, getSiteSchema } from "../operations/getSite";
import {
    executeListCollectionItems,
    listCollectionItemsSchema
} from "../operations/listCollectionItems";
import { executeListCollections, listCollectionsSchema } from "../operations/listCollections";
import { executeListSites, listSitesSchema } from "../operations/listSites";
import {
    executePublishCollectionItems,
    publishCollectionItemsSchema
} from "../operations/publishCollectionItems";
import { executePublishSite, publishSiteSchema } from "../operations/publishSite";
import {
    executeUpdateCollectionItem,
    updateCollectionItemSchema
} from "../operations/updateCollectionItem";
import type { WebflowClient } from "../client/WebflowClient";

// Mock WebflowClient factory
function createMockWebflowClient(): jest.Mocked<WebflowClient> {
    return {
        // Site methods
        listSites: jest.fn(),
        getSite: jest.fn(),
        publishSite: jest.fn(),
        // Collection methods
        listCollections: jest.fn(),
        getCollection: jest.fn(),
        // Collection Item methods
        listCollectionItems: jest.fn(),
        getCollectionItem: jest.fn(),
        createCollectionItem: jest.fn(),
        updateCollectionItem: jest.fn(),
        deleteCollectionItem: jest.fn(),
        publishCollectionItems: jest.fn(),
        // User methods
        getAuthorizedUser: jest.fn(),
        getTokenInfo: jest.fn(),
        // Base client methods
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        getSiteId: jest.fn(),
        setSiteId: jest.fn()
    } as unknown as jest.Mocked<WebflowClient>;
}

describe("Webflow Operation Executors", () => {
    let mockClient: jest.Mocked<WebflowClient>;

    beforeEach(() => {
        mockClient = createMockWebflowClient();
    });

    // ==========================================
    // Site Operations
    // ==========================================

    describe("executeListSites", () => {
        it("calls client with correct params", async () => {
            mockClient.listSites.mockResolvedValueOnce({
                sites: []
            });

            await executeListSites(mockClient, {});

            expect(mockClient.listSites).toHaveBeenCalledTimes(1);
        });

        it("returns normalized output on success", async () => {
            mockClient.listSites.mockResolvedValueOnce({
                sites: [
                    {
                        id: "site-123",
                        workspaceId: "workspace-456",
                        displayName: "My Website",
                        shortName: "mywebsite",
                        previewUrl: "https://mywebsite.webflow.io",
                        timeZone: "America/New_York",
                        createdOn: "2024-01-01T00:00:00Z",
                        lastUpdated: "2024-01-15T12:00:00Z",
                        lastPublished: "2024-01-14T10:00:00Z",
                        customDomains: [{ id: "domain-1", url: "https://example.com" }]
                    },
                    {
                        id: "site-789",
                        workspaceId: "workspace-456",
                        displayName: "Another Site",
                        shortName: "anothersite",
                        previewUrl: "https://anothersite.webflow.io",
                        timeZone: "Europe/London",
                        createdOn: "2024-02-01T00:00:00Z",
                        lastUpdated: "2024-02-10T08:00:00Z",
                        lastPublished: null
                    }
                ]
            });

            const result = await executeListSites(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();

            const data = result.data as { sites: unknown[]; count: number };
            expect(data.sites).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.sites[0]).toEqual({
                id: "site-123",
                workspaceId: "workspace-456",
                displayName: "My Website",
                shortName: "mywebsite",
                previewUrl: "https://mywebsite.webflow.io",
                timeZone: "America/New_York",
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                customDomains: [{ id: "domain-1", url: "https://example.com" }]
            });
        });

        it("handles empty sites list", async () => {
            mockClient.listSites.mockResolvedValueOnce({
                sites: []
            });

            const result = await executeListSites(mockClient, {});

            expect(result.success).toBe(true);
            const data = result.data as { sites: unknown[]; count: number };
            expect(data.sites).toHaveLength(0);
            expect(data.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listSites.mockRejectedValueOnce(
                new Error("Webflow authentication failed. Please reconnect your account.")
            );

            const result = await executeListSites(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Webflow authentication failed. Please reconnect your account."
            );
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listSites.mockRejectedValueOnce("string error");

            const result = await executeListSites(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list sites");
        });
    });

    describe("executeGetSite", () => {
        it("calls client with correct params", async () => {
            mockClient.getSite.mockResolvedValueOnce({
                id: "site-123",
                workspaceId: "workspace-456",
                displayName: "My Website",
                shortName: "mywebsite",
                previewUrl: "https://mywebsite.webflow.io",
                timeZone: "America/New_York",
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z"
            });

            await executeGetSite(mockClient, { siteId: "site-123" });

            expect(mockClient.getSite).toHaveBeenCalledWith("site-123");
        });

        it("returns normalized output on success", async () => {
            mockClient.getSite.mockResolvedValueOnce({
                id: "site-123",
                workspaceId: "workspace-456",
                displayName: "My Website",
                shortName: "mywebsite",
                previewUrl: "https://mywebsite.webflow.io",
                timeZone: "America/New_York",
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                customDomains: [{ id: "domain-1", url: "https://example.com" }],
                locales: {
                    primary: {
                        id: "locale-1",
                        cmsId: "cms-locale-1",
                        enabled: true,
                        displayName: "English",
                        redirect: false,
                        subdirectory: "",
                        tag: "en-US"
                    }
                }
            });

            const result = await executeGetSite(mockClient, { siteId: "site-123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "site-123",
                workspaceId: "workspace-456",
                displayName: "My Website",
                shortName: "mywebsite",
                previewUrl: "https://mywebsite.webflow.io",
                timeZone: "America/New_York",
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                customDomains: [{ id: "domain-1", url: "https://example.com" }],
                locales: {
                    primary: {
                        id: "locale-1",
                        cmsId: "cms-locale-1",
                        enabled: true,
                        displayName: "English",
                        redirect: false,
                        subdirectory: "",
                        tag: "en-US"
                    }
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getSite.mockRejectedValueOnce(
                new Error("Resource not found. Please check the ID and try again.")
            );

            const result = await executeGetSite(mockClient, { siteId: "invalid-id" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Resource not found. Please check the ID and try again."
            );
        });
    });

    describe("executePublishSite", () => {
        it("calls client with correct params", async () => {
            mockClient.publishSite.mockResolvedValueOnce({
                publishedOn: "2024-01-15T12:00:00Z"
            });

            await executePublishSite(mockClient, { siteId: "site-123" });

            expect(mockClient.publishSite).toHaveBeenCalledWith("site-123", {
                domains: undefined
            });
        });

        it("calls client with specific domains", async () => {
            mockClient.publishSite.mockResolvedValueOnce({
                publishedOn: "2024-01-15T12:00:00Z",
                customDomains: ["example.com"]
            });

            await executePublishSite(mockClient, {
                siteId: "site-123",
                domains: ["example.com"]
            });

            expect(mockClient.publishSite).toHaveBeenCalledWith("site-123", {
                domains: ["example.com"]
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.publishSite.mockResolvedValueOnce({
                publishedOn: "2024-01-15T12:00:00Z",
                customDomains: ["example.com", "www.example.com"]
            });

            const result = await executePublishSite(mockClient, { siteId: "site-123" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                publishedOn: "2024-01-15T12:00:00Z",
                customDomains: ["example.com", "www.example.com"]
            });
        });

        it("returns error on client failure", async () => {
            mockClient.publishSite.mockRejectedValueOnce(
                new Error("Insufficient permissions. Please check your app's access scopes.")
            );

            const result = await executePublishSite(mockClient, { siteId: "site-123" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false); // Publish is not retryable
        });
    });

    // ==========================================
    // Collection Operations
    // ==========================================

    describe("executeListCollections", () => {
        it("calls client with correct params", async () => {
            mockClient.listCollections.mockResolvedValueOnce({
                collections: []
            });

            await executeListCollections(mockClient, { siteId: "site-123" });

            expect(mockClient.listCollections).toHaveBeenCalledWith("site-123");
        });

        it("returns normalized output on success", async () => {
            mockClient.listCollections.mockResolvedValueOnce({
                collections: [
                    {
                        id: "coll-1",
                        displayName: "Blog Posts",
                        singularName: "Blog Post",
                        slug: "blog-posts",
                        createdOn: "2024-01-01T00:00:00Z",
                        lastUpdated: "2024-01-15T12:00:00Z"
                    },
                    {
                        id: "coll-2",
                        displayName: "Team Members",
                        singularName: "Team Member",
                        slug: "team-members",
                        createdOn: "2024-01-05T00:00:00Z",
                        lastUpdated: "2024-01-10T08:00:00Z"
                    }
                ]
            });

            const result = await executeListCollections(mockClient, { siteId: "site-123" });

            expect(result.success).toBe(true);
            const data = result.data as { collections: unknown[]; count: number };
            expect(data.collections).toHaveLength(2);
            expect(data.count).toBe(2);
            expect(data.collections[0]).toEqual({
                id: "coll-1",
                displayName: "Blog Posts",
                singularName: "Blog Post",
                slug: "blog-posts",
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.listCollections.mockRejectedValueOnce(new Error("Site not found"));

            const result = await executeListCollections(mockClient, { siteId: "invalid-site" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Site not found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetCollection", () => {
        it("calls client with correct params", async () => {
            mockClient.getCollection.mockResolvedValueOnce({
                id: "coll-1",
                displayName: "Blog Posts",
                singularName: "Blog Post",
                slug: "blog-posts",
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                fields: []
            });

            await executeGetCollection(mockClient, { collectionId: "coll-1" });

            expect(mockClient.getCollection).toHaveBeenCalledWith("coll-1");
        });

        it("returns normalized output with fields on success", async () => {
            mockClient.getCollection.mockResolvedValueOnce({
                id: "coll-1",
                displayName: "Blog Posts",
                singularName: "Blog Post",
                slug: "blog-posts",
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                fields: [
                    {
                        id: "field-1",
                        slug: "name",
                        displayName: "Name",
                        type: "PlainText",
                        isRequired: true,
                        isEditable: true,
                        helpText: "The title of the post"
                    },
                    {
                        id: "field-2",
                        slug: "content",
                        displayName: "Content",
                        type: "RichText",
                        isRequired: false,
                        isEditable: true
                    }
                ]
            });

            const result = await executeGetCollection(mockClient, { collectionId: "coll-1" });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.id).toBe("coll-1");
            expect(data.displayName).toBe("Blog Posts");
            expect(data.fields).toHaveLength(2);
            expect((data.fields as Array<Record<string, unknown>>)[0]).toEqual({
                id: "field-1",
                slug: "name",
                displayName: "Name",
                type: "PlainText",
                isRequired: true,
                isEditable: true,
                helpText: "The title of the post"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getCollection.mockRejectedValueOnce(new Error("Collection not found"));

            const result = await executeGetCollection(mockClient, { collectionId: "invalid" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
        });
    });

    // ==========================================
    // Collection Item Operations
    // ==========================================

    describe("executeListCollectionItems", () => {
        it("calls client with default params", async () => {
            mockClient.listCollectionItems.mockResolvedValueOnce({
                items: [],
                pagination: { offset: 0, limit: 100, total: 0 }
            });

            await executeListCollectionItems(mockClient, { collectionId: "coll-1" });

            expect(mockClient.listCollectionItems).toHaveBeenCalledWith("coll-1", {
                offset: undefined,
                limit: undefined
            });
        });

        it("calls client with custom pagination params", async () => {
            mockClient.listCollectionItems.mockResolvedValueOnce({
                items: [],
                pagination: { offset: 50, limit: 25, total: 100 }
            });

            await executeListCollectionItems(mockClient, {
                collectionId: "coll-1",
                offset: 50,
                limit: 25
            });

            expect(mockClient.listCollectionItems).toHaveBeenCalledWith("coll-1", {
                offset: 50,
                limit: 25
            });
        });

        it("returns normalized output on success with hasMore", async () => {
            mockClient.listCollectionItems.mockResolvedValueOnce({
                items: [
                    {
                        id: "item-1",
                        cmsLocaleId: "locale-1",
                        isArchived: false,
                        isDraft: false,
                        createdOn: "2024-01-01T00:00:00Z",
                        lastUpdated: "2024-01-15T12:00:00Z",
                        lastPublished: "2024-01-14T10:00:00Z",
                        fieldData: {
                            name: "First Post",
                            slug: "first-post"
                        }
                    }
                ],
                pagination: { offset: 0, limit: 100, total: 150 }
            });

            const result = await executeListCollectionItems(mockClient, { collectionId: "coll-1" });

            expect(result.success).toBe(true);
            const data = result.data as { items: unknown[]; pagination: unknown; hasMore: boolean };
            expect(data.items).toHaveLength(1);
            expect(data.hasMore).toBe(true);
            expect(data.pagination).toEqual({
                offset: 0,
                limit: 100,
                total: 150
            });
        });

        it("returns hasMore false when no more items", async () => {
            mockClient.listCollectionItems.mockResolvedValueOnce({
                items: [{ id: "item-1" }],
                pagination: { offset: 99, limit: 100, total: 100 }
            });

            const result = await executeListCollectionItems(mockClient, {
                collectionId: "coll-1",
                offset: 99
            });

            expect(result.success).toBe(true);
            const data = result.data as { hasMore: boolean };
            expect(data.hasMore).toBe(false);
        });

        it("returns error on client failure", async () => {
            mockClient.listCollectionItems.mockRejectedValueOnce(new Error("Rate limited"));

            const result = await executeListCollectionItems(mockClient, { collectionId: "coll-1" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetCollectionItem", () => {
        it("calls client with correct params", async () => {
            mockClient.getCollectionItem.mockResolvedValueOnce({
                id: "item-1",
                isArchived: false,
                isDraft: false,
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                fieldData: { name: "Test" }
            });

            await executeGetCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "item-1"
            });

            expect(mockClient.getCollectionItem).toHaveBeenCalledWith("coll-1", "item-1");
        });

        it("returns normalized output on success", async () => {
            mockClient.getCollectionItem.mockResolvedValueOnce({
                id: "item-1",
                cmsLocaleId: "locale-1",
                isArchived: false,
                isDraft: true,
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: null,
                fieldData: {
                    name: "Draft Post",
                    slug: "draft-post",
                    content: "<p>This is a draft.</p>"
                }
            });

            const result = await executeGetCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "item-1"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "item-1",
                cmsLocaleId: "locale-1",
                isArchived: false,
                isDraft: true,
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: null,
                fieldData: {
                    name: "Draft Post",
                    slug: "draft-post",
                    content: "<p>This is a draft.</p>"
                }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.getCollectionItem.mockRejectedValueOnce(new Error("Item not found"));

            const result = await executeGetCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
        });
    });

    describe("executeCreateCollectionItem", () => {
        it("calls client with correct params", async () => {
            mockClient.createCollectionItem.mockResolvedValueOnce({
                id: "item-new",
                isArchived: false,
                isDraft: false,
                createdOn: "2024-01-15T12:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: null,
                fieldData: { name: "New Post", slug: "new-post" }
            });

            await executeCreateCollectionItem(mockClient, {
                collectionId: "coll-1",
                isArchived: false,
                isDraft: false,
                fieldData: { name: "New Post", slug: "new-post" }
            });

            expect(mockClient.createCollectionItem).toHaveBeenCalledWith("coll-1", {
                isArchived: false,
                isDraft: false,
                fieldData: { name: "New Post", slug: "new-post" }
            });
        });

        it("creates draft item", async () => {
            mockClient.createCollectionItem.mockResolvedValueOnce({
                id: "item-draft",
                isArchived: false,
                isDraft: true,
                createdOn: "2024-01-15T12:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: null,
                fieldData: { name: "Draft" }
            });

            const result = await executeCreateCollectionItem(mockClient, {
                collectionId: "coll-1",
                isDraft: true,
                fieldData: { name: "Draft" }
            });

            expect(result.success).toBe(true);
            const data = result.data as { isDraft: boolean };
            expect(data.isDraft).toBe(true);
        });

        it("returns normalized output on success", async () => {
            mockClient.createCollectionItem.mockResolvedValueOnce({
                id: "item-new",
                cmsLocaleId: "locale-1",
                isArchived: false,
                isDraft: false,
                createdOn: "2024-01-15T12:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: null,
                fieldData: {
                    name: "New Post",
                    slug: "new-post",
                    author: "John Doe"
                }
            });

            const result = await executeCreateCollectionItem(mockClient, {
                collectionId: "coll-1",
                fieldData: { name: "New Post", slug: "new-post", author: "John Doe" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "item-new",
                cmsLocaleId: "locale-1",
                isArchived: false,
                isDraft: false,
                createdOn: "2024-01-15T12:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: null,
                fieldData: {
                    name: "New Post",
                    slug: "new-post",
                    author: "John Doe"
                }
            });
        });

        it("returns error on validation failure", async () => {
            mockClient.createCollectionItem.mockRejectedValueOnce(
                new Error("Validation error: name is required")
            );

            const result = await executeCreateCollectionItem(mockClient, {
                collectionId: "coll-1",
                fieldData: { slug: "missing-name" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Validation error: name is required");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on duplicate slug", async () => {
            mockClient.createCollectionItem.mockRejectedValueOnce(
                new Error("Conflict: Resource already exists")
            );

            const result = await executeCreateCollectionItem(mockClient, {
                collectionId: "coll-1",
                fieldData: { name: "Post", slug: "existing-slug" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Conflict: Resource already exists");
        });
    });

    describe("executeUpdateCollectionItem", () => {
        it("calls client with correct params", async () => {
            mockClient.updateCollectionItem.mockResolvedValueOnce({
                id: "item-1",
                isArchived: false,
                isDraft: false,
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                fieldData: { name: "Updated Title" }
            });

            await executeUpdateCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "item-1",
                fieldData: { name: "Updated Title" }
            });

            expect(mockClient.updateCollectionItem).toHaveBeenCalledWith("coll-1", "item-1", {
                isArchived: undefined,
                isDraft: undefined,
                fieldData: { name: "Updated Title" }
            });
        });

        it("updates archive status", async () => {
            mockClient.updateCollectionItem.mockResolvedValueOnce({
                id: "item-1",
                isArchived: true,
                isDraft: false,
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T12:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                fieldData: { name: "Archived Post" }
            });

            const result = await executeUpdateCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "item-1",
                isArchived: true
            });

            expect(result.success).toBe(true);
            const data = result.data as { isArchived: boolean };
            expect(data.isArchived).toBe(true);
        });

        it("returns normalized output on success", async () => {
            mockClient.updateCollectionItem.mockResolvedValueOnce({
                id: "item-1",
                cmsLocaleId: "locale-1",
                isArchived: false,
                isDraft: false,
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T14:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                fieldData: { name: "Updated Post", author: "Jane Doe" }
            });

            const result = await executeUpdateCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "item-1",
                fieldData: { name: "Updated Post", author: "Jane Doe" }
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                id: "item-1",
                cmsLocaleId: "locale-1",
                isArchived: false,
                isDraft: false,
                createdOn: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-15T14:00:00Z",
                lastPublished: "2024-01-14T10:00:00Z",
                fieldData: { name: "Updated Post", author: "Jane Doe" }
            });
        });

        it("returns error on client failure", async () => {
            mockClient.updateCollectionItem.mockRejectedValueOnce(new Error("Item not found"));

            const result = await executeUpdateCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "invalid",
                fieldData: { name: "Update" }
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteCollectionItem", () => {
        it("calls client with correct params", async () => {
            mockClient.deleteCollectionItem.mockResolvedValueOnce({
                deleted: 1
            });

            await executeDeleteCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "item-1"
            });

            expect(mockClient.deleteCollectionItem).toHaveBeenCalledWith("coll-1", "item-1");
        });

        it("returns normalized output on success", async () => {
            mockClient.deleteCollectionItem.mockResolvedValueOnce({
                deleted: 1
            });

            const result = await executeDeleteCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "item-1"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: 1,
                itemId: "item-1"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.deleteCollectionItem.mockRejectedValueOnce(new Error("Item not found"));

            const result = await executeDeleteCollectionItem(mockClient, {
                collectionId: "coll-1",
                itemId: "invalid"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executePublishCollectionItems", () => {
        it("calls client with correct params", async () => {
            mockClient.publishCollectionItems.mockResolvedValueOnce({
                publishedItemIds: ["item-1", "item-2"]
            });

            await executePublishCollectionItems(mockClient, {
                collectionId: "coll-1",
                itemIds: ["item-1", "item-2"]
            });

            expect(mockClient.publishCollectionItems).toHaveBeenCalledWith("coll-1", [
                "item-1",
                "item-2"
            ]);
        });

        it("publishes single item", async () => {
            mockClient.publishCollectionItems.mockResolvedValueOnce({
                publishedItemIds: ["item-1"]
            });

            const result = await executePublishCollectionItems(mockClient, {
                collectionId: "coll-1",
                itemIds: ["item-1"]
            });

            expect(result.success).toBe(true);
            const data = result.data as { publishedItemIds: string[]; count: number };
            expect(data.publishedItemIds).toEqual(["item-1"]);
            expect(data.count).toBe(1);
        });

        it("returns normalized output on success", async () => {
            mockClient.publishCollectionItems.mockResolvedValueOnce({
                publishedItemIds: ["item-1", "item-2", "item-3"]
            });

            const result = await executePublishCollectionItems(mockClient, {
                collectionId: "coll-1",
                itemIds: ["item-1", "item-2", "item-3"]
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                publishedItemIds: ["item-1", "item-2", "item-3"],
                count: 3
            });
        });

        it("returns error on client failure", async () => {
            mockClient.publishCollectionItems.mockRejectedValueOnce(
                new Error("Some items failed to publish")
            );

            const result = await executePublishCollectionItems(mockClient, {
                collectionId: "coll-1",
                itemIds: ["item-1"]
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ==========================================
    // Schema Validation Tests
    // ==========================================

    describe("schema validation", () => {
        describe("listSitesSchema", () => {
            it("validates empty input (no params required)", () => {
                const result = listSitesSchema.safeParse({});
                expect(result.success).toBe(true);
            });
        });

        describe("getSiteSchema", () => {
            it("validates with siteId", () => {
                const result = getSiteSchema.safeParse({
                    siteId: "site-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing siteId", () => {
                const result = getSiteSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty siteId", () => {
                const result = getSiteSchema.safeParse({
                    siteId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("publishSiteSchema", () => {
            it("validates with siteId only", () => {
                const result = publishSiteSchema.safeParse({
                    siteId: "site-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with domains", () => {
                const result = publishSiteSchema.safeParse({
                    siteId: "site-123",
                    domains: ["example.com", "www.example.com"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing siteId", () => {
                const result = publishSiteSchema.safeParse({
                    domains: ["example.com"]
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listCollectionsSchema", () => {
            it("validates with siteId", () => {
                const result = listCollectionsSchema.safeParse({
                    siteId: "site-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing siteId", () => {
                const result = listCollectionsSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("getCollectionSchema", () => {
            it("validates with collectionId", () => {
                const result = getCollectionSchema.safeParse({
                    collectionId: "coll-123"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing collectionId", () => {
                const result = getCollectionSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listCollectionItemsSchema", () => {
            it("validates with collectionId only", () => {
                const result = listCollectionItemsSchema.safeParse({
                    collectionId: "coll-123"
                });
                expect(result.success).toBe(true);
            });

            it("validates with pagination params", () => {
                const result = listCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    offset: 50,
                    limit: 25
                });
                expect(result.success).toBe(true);
            });

            it("applies default offset and limit", () => {
                const result = listCollectionItemsSchema.parse({
                    collectionId: "coll-123"
                });
                expect(result.offset).toBe(0);
                expect(result.limit).toBe(100);
            });

            it("rejects negative offset", () => {
                const result = listCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    offset: -1
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit over 100", () => {
                const result = listCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    limit: 101
                });
                expect(result.success).toBe(false);
            });

            it("rejects limit under 1", () => {
                const result = listCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    limit: 0
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getCollectionItemSchema", () => {
            it("validates with collectionId and itemId", () => {
                const result = getCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    itemId: "item-456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing collectionId", () => {
                const result = getCollectionItemSchema.safeParse({
                    itemId: "item-456"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing itemId", () => {
                const result = getCollectionItemSchema.safeParse({
                    collectionId: "coll-123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createCollectionItemSchema", () => {
            it("validates with required fields", () => {
                const result = createCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    fieldData: { name: "Test Item" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with all optional fields", () => {
                const result = createCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    isArchived: false,
                    isDraft: true,
                    fieldData: { name: "Test Item", slug: "test-item" }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing collectionId", () => {
                const result = createCollectionItemSchema.safeParse({
                    fieldData: { name: "Test" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing fieldData", () => {
                const result = createCollectionItemSchema.safeParse({
                    collectionId: "coll-123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("updateCollectionItemSchema", () => {
            it("validates with required fields", () => {
                const result = updateCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    itemId: "item-456"
                });
                expect(result.success).toBe(true);
            });

            it("validates with fieldData", () => {
                const result = updateCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    itemId: "item-456",
                    fieldData: { name: "Updated Name" }
                });
                expect(result.success).toBe(true);
            });

            it("validates with status flags", () => {
                const result = updateCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    itemId: "item-456",
                    isArchived: true,
                    isDraft: false
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing collectionId", () => {
                const result = updateCollectionItemSchema.safeParse({
                    itemId: "item-456",
                    fieldData: { name: "Test" }
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing itemId", () => {
                const result = updateCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    fieldData: { name: "Test" }
                });
                expect(result.success).toBe(false);
            });
        });

        describe("deleteCollectionItemSchema", () => {
            it("validates with collectionId and itemId", () => {
                const result = deleteCollectionItemSchema.safeParse({
                    collectionId: "coll-123",
                    itemId: "item-456"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing collectionId", () => {
                const result = deleteCollectionItemSchema.safeParse({
                    itemId: "item-456"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing itemId", () => {
                const result = deleteCollectionItemSchema.safeParse({
                    collectionId: "coll-123"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("publishCollectionItemsSchema", () => {
            it("validates with collectionId and itemIds", () => {
                const result = publishCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    itemIds: ["item-1", "item-2"]
                });
                expect(result.success).toBe(true);
            });

            it("validates with single itemId", () => {
                const result = publishCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    itemIds: ["item-1"]
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty itemIds array", () => {
                const result = publishCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    itemIds: []
                });
                expect(result.success).toBe(false);
            });

            it("rejects itemIds array over 100", () => {
                const itemIds = Array.from({ length: 101 }, (_, i) => `item-${i}`);
                const result = publishCollectionItemsSchema.safeParse({
                    collectionId: "coll-123",
                    itemIds
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing collectionId", () => {
                const result = publishCollectionItemsSchema.safeParse({
                    itemIds: ["item-1"]
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing itemIds", () => {
                const result = publishCollectionItemsSchema.safeParse({
                    collectionId: "coll-123"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
