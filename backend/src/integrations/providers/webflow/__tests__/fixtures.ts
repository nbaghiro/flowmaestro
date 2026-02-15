/**
 * Webflow test fixtures
 *
 * Reusable test data for Webflow provider tests.
 */

import type {
    WebflowSite,
    WebflowCollection,
    WebflowCollectionItem,
    WebflowCollectionField
} from "../operations/types";

/**
 * Sample site data
 */
export const sampleSite: WebflowSite = {
    id: "site-123",
    workspaceId: "workspace-456",
    displayName: "My Awesome Website",
    shortName: "awesome-site",
    previewUrl: "https://awesome-site.webflow.io",
    timeZone: "America/New_York",
    createdOn: "2024-01-01T00:00:00Z",
    lastUpdated: "2024-01-15T12:00:00Z",
    lastPublished: "2024-01-14T10:00:00Z",
    customDomains: [
        { id: "domain-1", url: "https://example.com" },
        { id: "domain-2", url: "https://www.example.com" }
    ],
    locales: {
        primary: {
            id: "locale-1",
            cmsId: "cms-locale-1",
            enabled: true,
            displayName: "English (US)",
            redirect: false,
            subdirectory: "",
            tag: "en-US"
        }
    }
};

export const sampleSiteWithoutDomains: WebflowSite = {
    id: "site-789",
    workspaceId: "workspace-456",
    displayName: "New Site",
    shortName: "new-site",
    previewUrl: "https://new-site.webflow.io",
    timeZone: "Europe/London",
    createdOn: "2024-02-01T00:00:00Z",
    lastUpdated: "2024-02-10T08:00:00Z",
    lastPublished: null
};

/**
 * Sample collection field data
 */
export const sampleCollectionFields: WebflowCollectionField[] = [
    {
        id: "field-name",
        slug: "name",
        displayName: "Name",
        type: "PlainText",
        isRequired: true,
        isEditable: true,
        helpText: "The name of the item"
    },
    {
        id: "field-slug",
        slug: "slug",
        displayName: "Slug",
        type: "PlainText",
        isRequired: true,
        isEditable: true,
        helpText: "URL-friendly identifier"
    },
    {
        id: "field-content",
        slug: "content",
        displayName: "Content",
        type: "RichText",
        isRequired: false,
        isEditable: true
    },
    {
        id: "field-published",
        slug: "published-date",
        displayName: "Published Date",
        type: "DateTime",
        isRequired: false,
        isEditable: true
    },
    {
        id: "field-featured",
        slug: "featured",
        displayName: "Featured",
        type: "Bool",
        isRequired: false,
        isEditable: true
    }
];

/**
 * Sample collection data
 */
export const sampleCollection: WebflowCollection = {
    id: "coll-blog",
    displayName: "Blog Posts",
    singularName: "Blog Post",
    slug: "blog-posts",
    createdOn: "2024-01-01T00:00:00Z",
    lastUpdated: "2024-01-15T12:00:00Z",
    fields: sampleCollectionFields
};

export const sampleCollectionTeam: WebflowCollection = {
    id: "coll-team",
    displayName: "Team Members",
    singularName: "Team Member",
    slug: "team-members",
    createdOn: "2024-01-05T00:00:00Z",
    lastUpdated: "2024-01-10T08:00:00Z",
    fields: [
        {
            id: "field-name",
            slug: "name",
            displayName: "Name",
            type: "PlainText",
            isRequired: true,
            isEditable: true
        },
        {
            id: "field-role",
            slug: "role",
            displayName: "Role",
            type: "PlainText",
            isRequired: true,
            isEditable: true
        },
        {
            id: "field-bio",
            slug: "bio",
            displayName: "Biography",
            type: "RichText",
            isRequired: false,
            isEditable: true
        },
        {
            id: "field-photo",
            slug: "photo",
            displayName: "Photo",
            type: "ImageRef",
            isRequired: false,
            isEditable: true
        }
    ]
};

/**
 * Sample collection item data
 */
export const sampleCollectionItem: WebflowCollectionItem = {
    id: "item-1",
    cmsLocaleId: "locale-1",
    lastPublished: "2024-01-14T10:00:00Z",
    lastUpdated: "2024-01-15T12:00:00Z",
    createdOn: "2024-01-01T00:00:00Z",
    isArchived: false,
    isDraft: false,
    fieldData: {
        name: "Getting Started with Webflow",
        slug: "getting-started-webflow",
        content: "<p>This is the content of the blog post...</p>",
        "published-date": "2024-01-14T00:00:00Z",
        featured: true
    }
};

export const sampleDraftItem: WebflowCollectionItem = {
    id: "item-2",
    cmsLocaleId: "locale-1",
    lastPublished: null,
    lastUpdated: "2024-01-15T14:00:00Z",
    createdOn: "2024-01-15T14:00:00Z",
    isArchived: false,
    isDraft: true,
    fieldData: {
        name: "Upcoming Post",
        slug: "upcoming-post",
        content: "<p>This is a draft...</p>"
    }
};

export const sampleArchivedItem: WebflowCollectionItem = {
    id: "item-3",
    cmsLocaleId: "locale-1",
    lastPublished: "2023-12-01T10:00:00Z",
    lastUpdated: "2024-01-10T08:00:00Z",
    createdOn: "2023-11-01T00:00:00Z",
    isArchived: true,
    isDraft: false,
    fieldData: {
        name: "Old Archived Post",
        slug: "old-archived-post",
        content: "<p>This post is archived.</p>"
    }
};

/**
 * Sample team member item
 */
export const sampleTeamMember: WebflowCollectionItem = {
    id: "team-1",
    cmsLocaleId: "locale-1",
    lastPublished: "2024-01-10T10:00:00Z",
    lastUpdated: "2024-01-10T10:00:00Z",
    createdOn: "2024-01-05T00:00:00Z",
    isArchived: false,
    isDraft: false,
    fieldData: {
        name: "Jane Doe",
        slug: "jane-doe",
        role: "Software Engineer",
        bio: "<p>Jane is a passionate developer...</p>"
    }
};

/**
 * Sample API responses
 */
export const sampleListSitesResponse = {
    sites: [sampleSite, sampleSiteWithoutDomains]
};

export const sampleListCollectionsResponse = {
    collections: [sampleCollection, sampleCollectionTeam]
};

export const sampleListItemsResponse = {
    items: [sampleCollectionItem, sampleDraftItem, sampleArchivedItem],
    pagination: {
        offset: 0,
        limit: 100,
        total: 3
    }
};

export const sampleListItemsResponseWithPagination = {
    items: [sampleCollectionItem],
    pagination: {
        offset: 0,
        limit: 1,
        total: 100
    }
};

export const samplePublishSiteResponse = {
    publishedOn: "2024-01-15T15:00:00Z",
    customDomains: ["example.com", "www.example.com"]
};

export const samplePublishItemsResponse = {
    publishedItemIds: ["item-1", "item-2"]
};

export const sampleDeleteItemResponse = {
    deleted: 1
};

/**
 * Sample error responses
 */
export const sampleAuthError = {
    code: "invalid_token",
    message: "The provided access token is invalid or expired"
};

export const sampleNotFoundError = {
    code: "not_found",
    message: "The requested resource was not found"
};

export const sampleRateLimitError = {
    code: "rate_limit_exceeded",
    message: "Rate limit exceeded. Please try again later."
};

export const sampleValidationError = {
    code: "validation_error",
    message: "The request body is invalid",
    details: [
        { field: "fieldData.name", message: "name is required" }
    ]
};

export const sampleConflictError = {
    code: "conflict",
    message: "An item with this slug already exists"
};
