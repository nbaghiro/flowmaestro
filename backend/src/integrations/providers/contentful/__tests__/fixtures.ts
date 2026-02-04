/**
 * Contentful Provider Test Fixtures
 *
 * Comprehensive test data for Contentful CMS operations including
 * spaces, content types, entries, assets, and publishing.
 */

import type { TestFixture } from "../../../sandbox";

// Sample IDs
const sampleSpaceId = "cfexampleapi";
const sampleSpaceId2 = "cfspaceid2";
const sampleEntryId = "5KsDBWseXY6QegucYAoacS";
const sampleEntryId2 = "6KsDBWseXY6QegucYAoacT";
const sampleContentTypeId = "blogPost";
const sampleAssetId = "3wtvPBGKkMUEGIgegeaqW2";

export const contentfulFixtures: TestFixture[] = [
    {
        operationId: "listSpaces",
        provider: "contentful",
        validCases: [
            {
                name: "list_accessible_spaces",
                description: "List all spaces accessible to the authenticated user",
                input: {},
                expectedOutput: {
                    spaces: [
                        {
                            id: sampleSpaceId,
                            name: "Marketing Website"
                        },
                        {
                            id: sampleSpaceId2,
                            name: "Developer Documentation"
                        },
                        {
                            id: "cfspaceid3",
                            name: "Mobile App Content"
                        }
                    ],
                    total: 3
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_token",
                description: "Personal Access Token is invalid or expired",
                input: {},
                expectedError: {
                    type: "permission",
                    message:
                        "Contentful authentication failed. Please check your Personal Access Token.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listContentTypes",
        provider: "contentful",
        validCases: [
            {
                name: "list_content_types_default_env",
                description: "List content types in the master environment",
                input: {},
                expectedOutput: {
                    contentTypes: [
                        {
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
                                },
                                {
                                    id: "body",
                                    name: "Body",
                                    type: "RichText",
                                    required: true,
                                    localized: true
                                },
                                {
                                    id: "publishDate",
                                    name: "Publish Date",
                                    type: "Date",
                                    required: false,
                                    localized: false
                                },
                                {
                                    id: "featuredImage",
                                    name: "Featured Image",
                                    type: "Link",
                                    required: false,
                                    localized: false
                                }
                            ]
                        },
                        {
                            id: "page",
                            name: "Page",
                            description: "A static page",
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
                                    id: "content",
                                    name: "Content",
                                    type: "RichText",
                                    required: true,
                                    localized: true
                                }
                            ]
                        },
                        {
                            id: "author",
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
                                },
                                {
                                    id: "bio",
                                    name: "Bio",
                                    type: "Text",
                                    required: false,
                                    localized: true
                                },
                                {
                                    id: "avatar",
                                    name: "Avatar",
                                    type: "Link",
                                    required: false,
                                    localized: false
                                }
                            ]
                        }
                    ],
                    total: 3
                }
            }
        ],
        errorCases: [
            {
                name: "space_not_found",
                description: "The configured space ID does not exist",
                input: {},
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Contentful.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listEntries",
        provider: "contentful",
        validCases: [
            {
                name: "list_entries_with_content_type_filter",
                description: "List blog post entries with content type filter",
                input: {
                    contentType: "blogPost",
                    limit: 10,
                    skip: 0
                },
                expectedOutput: {
                    entries: [
                        {
                            id: sampleEntryId,
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
                                                        value: "Welcome to our guide on getting started with Contentful headless CMS."
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                },
                                publishDate: { "en-US": "2024-03-15" }
                            },
                            createdAt: "2024-03-10T08:00:00.000Z",
                            updatedAt: "2024-03-15T10:30:00.000Z",
                            publishedAt: "2024-03-15T10:30:00.000Z"
                        },
                        {
                            id: sampleEntryId2,
                            contentTypeId: "blogPost",
                            version: 3,
                            fields: {
                                title: {
                                    "en-US": "Advanced Content Modeling Patterns"
                                },
                                slug: {
                                    "en-US": "advanced-content-modeling"
                                },
                                body: {
                                    "en-US": {
                                        nodeType: "document",
                                        content: [
                                            {
                                                nodeType: "paragraph",
                                                content: [
                                                    {
                                                        nodeType: "text",
                                                        value: "Learn how to design flexible content models for complex applications."
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                },
                                publishDate: { "en-US": "2024-03-18" }
                            },
                            createdAt: "2024-03-12T14:00:00.000Z",
                            updatedAt: "2024-03-18T09:00:00.000Z",
                            publishedAt: "2024-03-18T09:00:00.000Z"
                        }
                    ],
                    total: 2,
                    skip: 0,
                    limit: 10
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_content_type",
                description: "Content type does not exist",
                input: {
                    contentType: "nonExistentType",
                    limit: 10
                },
                expectedError: {
                    type: "validation",
                    message: "The content type 'nonExistentType' does not exist",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 10 },
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getEntry",
        provider: "contentful",
        validCases: [
            {
                name: "get_entry_by_id",
                description: "Get a single blog post entry by ID",
                input: {
                    entryId: sampleEntryId
                },
                expectedOutput: {
                    id: sampleEntryId,
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
                                                value: "Welcome to our guide on getting started with Contentful headless CMS."
                                            }
                                        ]
                                    }
                                ]
                            }
                        },
                        publishDate: { "en-US": "2024-03-15" }
                    },
                    createdAt: "2024-03-10T08:00:00.000Z",
                    updatedAt: "2024-03-15T10:30:00.000Z",
                    publishedAt: "2024-03-15T10:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "entry_not_found",
                description: "Entry ID does not exist",
                input: {
                    entryId: "nonexistent-entry-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Contentful.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    entryId: sampleEntryId
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createEntry",
        provider: "contentful",
        validCases: [
            {
                name: "create_blog_post_entry",
                description: "Create a new blog post entry",
                input: {
                    contentTypeId: sampleContentTypeId,
                    fields: {
                        title: { "en-US": "My New Blog Post" },
                        slug: { "en-US": "my-new-blog-post" },
                        body: {
                            "en-US": {
                                nodeType: "document",
                                content: [
                                    {
                                        nodeType: "paragraph",
                                        content: [
                                            {
                                                nodeType: "text",
                                                value: "This is the body of my new blog post about Contentful integration."
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                },
                expectedOutput: {
                    id: "7KsDBWseXY6QegucYAoacU",
                    contentTypeId: sampleContentTypeId,
                    version: 1,
                    fields: {
                        title: { "en-US": "My New Blog Post" },
                        slug: { "en-US": "my-new-blog-post" },
                        body: {
                            "en-US": {
                                nodeType: "document",
                                content: [
                                    {
                                        nodeType: "paragraph",
                                        content: [
                                            {
                                                nodeType: "text",
                                                value: "This is the body of my new blog post about Contentful integration."
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    createdAt: "2024-03-20T12:00:00.000Z",
                    updatedAt: "2024-03-20T12:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_content_type",
                description: "Content type does not exist",
                input: {
                    contentTypeId: "nonExistentType",
                    fields: {
                        title: { "en-US": "Test" }
                    }
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Contentful.",
                    retryable: false
                }
            },
            {
                name: "missing_required_field",
                description: "Required field is missing",
                input: {
                    contentTypeId: sampleContentTypeId,
                    fields: {
                        slug: { "en-US": "missing-title" }
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Contentful API error: Validation error",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    contentTypeId: sampleContentTypeId,
                    fields: { title: { "en-US": "Test" } }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateEntry",
        provider: "contentful",
        validCases: [
            {
                name: "update_entry_fields",
                description: "Update an entry's title field",
                input: {
                    entryId: sampleEntryId,
                    version: 5,
                    fields: {
                        title: { "en-US": "Updated: Getting Started with Contentful" },
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
                                                value: "Updated content for our Contentful guide."
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                },
                expectedOutput: {
                    id: sampleEntryId,
                    contentTypeId: "blogPost",
                    version: 6,
                    fields: {
                        title: { "en-US": "Updated: Getting Started with Contentful" },
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
                                                value: "Updated content for our Contentful guide."
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    createdAt: "2024-03-10T08:00:00.000Z",
                    updatedAt: "2024-03-20T14:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "version_conflict",
                description: "Entry has been modified since last retrieval",
                input: {
                    entryId: sampleEntryId,
                    version: 3,
                    fields: {
                        title: { "en-US": "Stale Update" }
                    }
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "Contentful version conflict. The entry has been modified since you last retrieved it.",
                    retryable: false
                }
            },
            {
                name: "entry_not_found",
                description: "Entry does not exist",
                input: {
                    entryId: "nonexistent-entry-id",
                    version: 1,
                    fields: {
                        title: { "en-US": "Test" }
                    }
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Contentful.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    entryId: sampleEntryId,
                    version: 5,
                    fields: { title: { "en-US": "Test" } }
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "publishEntry",
        provider: "contentful",
        validCases: [
            {
                name: "publish_entry",
                description: "Publish a draft entry",
                input: {
                    entryId: sampleEntryId,
                    version: 6,
                    action: "publish"
                },
                expectedOutput: {
                    id: sampleEntryId,
                    contentTypeId: "blogPost",
                    version: 7,
                    publishedAt: "2024-03-20T15:00:00.000Z",
                    action: "publish"
                }
            },
            {
                name: "unpublish_entry",
                description: "Unpublish a published entry",
                input: {
                    entryId: sampleEntryId,
                    version: 7,
                    action: "unpublish"
                },
                expectedOutput: {
                    id: sampleEntryId,
                    contentTypeId: "blogPost",
                    version: 8,
                    publishedAt: undefined,
                    action: "unpublish"
                }
            }
        ],
        errorCases: [
            {
                name: "version_conflict",
                description: "Entry version mismatch during publish",
                input: {
                    entryId: sampleEntryId,
                    version: 2,
                    action: "publish"
                },
                expectedError: {
                    type: "server_error",
                    message:
                        "Contentful version conflict. The entry has been modified since you last retrieved it.",
                    retryable: false
                }
            },
            {
                name: "entry_not_found",
                description: "Entry does not exist",
                input: {
                    entryId: "nonexistent-entry-id",
                    version: 1,
                    action: "publish"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Contentful.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    entryId: sampleEntryId,
                    version: 6,
                    action: "publish"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listAssets",
        provider: "contentful",
        validCases: [
            {
                name: "list_assets_default",
                description: "List assets in the space",
                input: {
                    limit: 10
                },
                expectedOutput: {
                    assets: [
                        {
                            id: sampleAssetId,
                            title: "Hero Banner",
                            description: "Homepage hero banner image",
                            fileName: "hero-banner.jpg",
                            contentType: "image/jpeg",
                            url: "https://images.ctfassets.net/cfexampleapi/3wtvPBGKkMUEGIgegeaqW2/hero-banner.jpg",
                            size: 245760,
                            width: 1920,
                            height: 1080,
                            createdAt: "2024-03-01T08:00:00.000Z",
                            updatedAt: "2024-03-01T08:00:00.000Z"
                        },
                        {
                            id: "4xtvPBGKkMUEGIgegeaqW3",
                            title: "Team Photo",
                            description: "Company team photograph",
                            fileName: "team-photo.png",
                            contentType: "image/png",
                            url: "https://images.ctfassets.net/cfexampleapi/4xtvPBGKkMUEGIgegeaqW3/team-photo.png",
                            size: 512000,
                            width: 2400,
                            height: 1600,
                            createdAt: "2024-03-05T10:00:00.000Z",
                            updatedAt: "2024-03-05T10:00:00.000Z"
                        },
                        {
                            id: "5ytvPBGKkMUEGIgegeaqW4",
                            title: "Product Screenshot",
                            description: "Dashboard product screenshot",
                            fileName: "product-screenshot.png",
                            contentType: "image/png",
                            url: "https://images.ctfassets.net/cfexampleapi/5ytvPBGKkMUEGIgegeaqW4/product-screenshot.png",
                            size: 389120,
                            width: 1440,
                            height: 900,
                            createdAt: "2024-03-10T14:00:00.000Z",
                            updatedAt: "2024-03-10T14:00:00.000Z"
                        }
                    ],
                    total: 3,
                    skip: 0,
                    limit: 10
                }
            }
        ],
        errorCases: [
            {
                name: "space_not_found",
                description: "The configured space ID does not exist",
                input: { limit: 10 },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Contentful.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 10 },
                expectedError: {
                    type: "rate_limit",
                    message: "Contentful rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    }
];
