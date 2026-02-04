/**
 * Ghost Provider Test Fixtures
 *
 * Comprehensive test data for Ghost publishing platform operations including
 * posts, tags, members, and site configuration.
 */

import type { TestFixture } from "../../../sandbox";

// Sample IDs following Ghost's ID format (24-character hex)
const samplePostId = "63a1c2d3e4f5a6b7c8d9e0f1";
const samplePostId2 = "63b2c3d4e5f6a7b8c9d0e1f2";
const samplePostUuid = "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6";
const samplePostUuid2 = "b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7";
const sampleTagId = "63c3d4e5f6a7b8c9d0e1f2a3";
const sampleTagId2 = "63d4e5f6a7b8c9d0e1f2a3b4";
const sampleTagId3 = "63e5f6a7b8c9d0e1f2a3b4c5";
const sampleMemberId = "63f6a7b8c9d0e1f2a3b4c5d6";
const sampleMemberId2 = "64a7b8c9d0e1f2a3b4c5d6e7";
const sampleAuthorId = "1";

export const ghostFixtures: TestFixture[] = [
    {
        operationId: "listPosts",
        provider: "ghost",
        validCases: [
            {
                name: "list_published_posts",
                description: "List published posts with tags and authors",
                input: {
                    filter: "status:published",
                    limit: 10,
                    page: 1
                },
                expectedOutput: {
                    posts: [
                        {
                            id: samplePostId,
                            uuid: samplePostUuid,
                            title: "Getting Started with Ghost",
                            slug: "getting-started-with-ghost",
                            status: "published",
                            visibility: "public",
                            url: "https://demo.ghost.io/getting-started-with-ghost/",
                            excerpt: "A comprehensive guide to setting up your Ghost publication",
                            featureImage:
                                "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200",
                            featured: true,
                            createdAt: "2024-03-01T08:00:00.000Z",
                            updatedAt: "2024-03-15T10:30:00.000Z",
                            publishedAt: "2024-03-15T10:30:00.000Z",
                            tags: [
                                {
                                    id: sampleTagId,
                                    name: "Getting Started",
                                    slug: "getting-started"
                                },
                                {
                                    id: sampleTagId2,
                                    name: "Tutorials",
                                    slug: "tutorials"
                                }
                            ],
                            authors: [
                                {
                                    id: sampleAuthorId,
                                    name: "Ghost Author",
                                    slug: "ghost-author"
                                }
                            ]
                        },
                        {
                            id: samplePostId2,
                            uuid: samplePostUuid2,
                            title: "Building a Membership Business with Ghost",
                            slug: "building-membership-business",
                            status: "published",
                            visibility: "public",
                            url: "https://demo.ghost.io/building-membership-business/",
                            excerpt:
                                "Learn how to monetize your content with Ghost's built-in membership features",
                            featureImage:
                                "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1200",
                            featured: false,
                            createdAt: "2024-03-05T12:00:00.000Z",
                            updatedAt: "2024-03-18T14:00:00.000Z",
                            publishedAt: "2024-03-18T14:00:00.000Z",
                            tags: [
                                {
                                    id: sampleTagId3,
                                    name: "Membership",
                                    slug: "membership"
                                }
                            ],
                            authors: [
                                {
                                    id: sampleAuthorId,
                                    name: "Ghost Author",
                                    slug: "ghost-author"
                                }
                            ]
                        }
                    ],
                    pagination: {
                        page: 1,
                        limit: 10,
                        pages: 1,
                        total: 2,
                        next: null,
                        prev: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_api_key",
                description: "Admin API Key is invalid or expired",
                input: { limit: 10 },
                expectedError: {
                    type: "permission",
                    message: "Ghost authentication failed. Please check your Admin API Key.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 10 },
                expectedError: {
                    type: "rate_limit",
                    message: "Ghost rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPost",
        provider: "ghost",
        validCases: [
            {
                name: "get_post_by_id",
                description: "Get a single post by its ID",
                input: {
                    idOrSlug: samplePostId,
                    by: "id"
                },
                expectedOutput: {
                    id: samplePostId,
                    uuid: samplePostUuid,
                    title: "Getting Started with Ghost",
                    slug: "getting-started-with-ghost",
                    html: "<p>Welcome to Ghost! This is your first post. Read it carefully to learn about the Ghost editor and how to set up your site.</p><h2>Quick Start Guide</h2><p>Ghost uses a simple, streamlined editor that's designed to help you focus on writing. You can use Markdown shortcuts or the floating toolbar to format your content.</p>",
                    status: "published",
                    visibility: "public",
                    url: "https://demo.ghost.io/getting-started-with-ghost/",
                    excerpt: "A comprehensive guide to setting up your Ghost publication",
                    featureImage:
                        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200",
                    featured: true,
                    createdAt: "2024-03-01T08:00:00.000Z",
                    updatedAt: "2024-03-15T10:30:00.000Z",
                    publishedAt: "2024-03-15T10:30:00.000Z",
                    tags: [
                        {
                            id: sampleTagId,
                            name: "Getting Started",
                            slug: "getting-started"
                        },
                        {
                            id: sampleTagId2,
                            name: "Tutorials",
                            slug: "tutorials"
                        }
                    ],
                    authors: [
                        {
                            id: sampleAuthorId,
                            name: "Ghost Author",
                            slug: "ghost-author"
                        }
                    ]
                }
            },
            {
                name: "get_post_by_slug",
                description: "Get a single post by its slug",
                input: {
                    idOrSlug: "getting-started-with-ghost",
                    by: "slug"
                },
                expectedOutput: {
                    id: samplePostId,
                    uuid: samplePostUuid,
                    title: "Getting Started with Ghost",
                    slug: "getting-started-with-ghost",
                    html: "<p>Welcome to Ghost! This is your first post.</p>",
                    status: "published",
                    visibility: "public",
                    url: "https://demo.ghost.io/getting-started-with-ghost/",
                    featured: true,
                    createdAt: "2024-03-01T08:00:00.000Z",
                    updatedAt: "2024-03-15T10:30:00.000Z",
                    publishedAt: "2024-03-15T10:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Post ID does not exist",
                input: {
                    idOrSlug: "nonexistent-post-id",
                    by: "id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Ghost.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    idOrSlug: samplePostId,
                    by: "id"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Ghost rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createPost",
        provider: "ghost",
        validCases: [
            {
                name: "create_draft_post",
                description: "Create a new draft post with tags",
                input: {
                    title: "How to Build a Newsletter with Ghost",
                    html: "<p>Ghost makes it easy to build and grow your email newsletter alongside your website.</p><h2>Step 1: Configure Mailgun</h2><p>First, set up your Mailgun integration in Ghost Admin settings.</p>",
                    status: "draft",
                    visibility: "public",
                    tags: ["newsletter", "tutorials"],
                    excerpt: "A step-by-step guide to setting up newsletters in Ghost"
                },
                expectedOutput: {
                    id: "64b8c9d0e1f2a3b4c5d6e7f8",
                    uuid: "c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8",
                    title: "How to Build a Newsletter with Ghost",
                    slug: "how-to-build-a-newsletter-with-ghost",
                    status: "draft",
                    visibility: "public",
                    url: "https://demo.ghost.io/p/how-to-build-a-newsletter-with-ghost/",
                    createdAt: "2024-03-20T12:00:00.000Z",
                    updatedAt: "2024-03-20T12:00:00.000Z",
                    publishedAt: null
                }
            },
            {
                name: "create_published_post",
                description: "Create and immediately publish a post",
                input: {
                    title: "Breaking News: Major Product Update",
                    html: "<p>We're excited to announce a major update to our platform.</p>",
                    status: "published",
                    visibility: "public",
                    featured: true
                },
                expectedOutput: {
                    id: "64c9d0e1f2a3b4c5d6e7f8a9",
                    uuid: "d4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9",
                    title: "Breaking News: Major Product Update",
                    slug: "breaking-news-major-product-update",
                    status: "published",
                    visibility: "public",
                    url: "https://demo.ghost.io/breaking-news-major-product-update/",
                    createdAt: "2024-03-20T14:00:00.000Z",
                    updatedAt: "2024-03-20T14:00:00.000Z",
                    publishedAt: "2024-03-20T14:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_title",
                description: "Post title is required",
                input: {
                    html: "<p>Content without title</p>",
                    status: "draft"
                },
                expectedError: {
                    type: "validation",
                    message: "Post title is required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    title: "Test Post",
                    status: "draft"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Ghost rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updatePost",
        provider: "ghost",
        validCases: [
            {
                name: "update_post_title_and_status",
                description: "Update a post's title and publish it",
                input: {
                    id: samplePostId,
                    updatedAt: "2024-03-15T10:30:00.000Z",
                    title: "Updated: Getting Started with Ghost (2024 Edition)",
                    status: "published"
                },
                expectedOutput: {
                    id: samplePostId,
                    uuid: samplePostUuid,
                    title: "Updated: Getting Started with Ghost (2024 Edition)",
                    slug: "getting-started-with-ghost",
                    status: "published",
                    visibility: "public",
                    url: "https://demo.ghost.io/getting-started-with-ghost/",
                    createdAt: "2024-03-01T08:00:00.000Z",
                    updatedAt: "2024-03-20T16:00:00.000Z",
                    publishedAt: "2024-03-15T10:30:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "missing_updated_at",
                description: "updated_at is required for conflict detection",
                input: {
                    id: samplePostId,
                    updatedAt: "",
                    title: "Failed Update"
                },
                expectedError: {
                    type: "validation",
                    message: "The updated_at field is required for update operations",
                    retryable: false
                }
            },
            {
                name: "post_not_found",
                description: "Post does not exist",
                input: {
                    id: "nonexistent-post-id",
                    updatedAt: "2024-03-15T10:30:00.000Z",
                    title: "Update Non-Existent"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Ghost.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: samplePostId,
                    updatedAt: "2024-03-15T10:30:00.000Z",
                    title: "Test"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Ghost rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deletePost",
        provider: "ghost",
        validCases: [
            {
                name: "delete_post",
                description: "Delete a post by ID",
                input: {
                    id: samplePostId
                },
                expectedOutput: {
                    id: samplePostId,
                    deleted: true
                }
            }
        ],
        errorCases: [
            {
                name: "post_not_found",
                description: "Post does not exist",
                input: {
                    id: "nonexistent-post-id"
                },
                expectedError: {
                    type: "not_found",
                    message: "Resource not found in Ghost.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    id: samplePostId
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Ghost rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listTags",
        provider: "ghost",
        validCases: [
            {
                name: "list_all_tags",
                description: "List all tags on the Ghost site",
                input: {
                    limit: 15,
                    page: 1
                },
                expectedOutput: {
                    tags: [
                        {
                            id: sampleTagId,
                            name: "Getting Started",
                            slug: "getting-started",
                            description: "Guides and tutorials for new Ghost users",
                            visibility: "public",
                            url: "https://demo.ghost.io/tag/getting-started/"
                        },
                        {
                            id: sampleTagId2,
                            name: "Tutorials",
                            slug: "tutorials",
                            description: "Step-by-step tutorials and how-tos",
                            visibility: "public",
                            url: "https://demo.ghost.io/tag/tutorials/"
                        },
                        {
                            id: sampleTagId3,
                            name: "Membership",
                            slug: "membership",
                            description: "Everything about building a membership business",
                            visibility: "public",
                            url: "https://demo.ghost.io/tag/membership/"
                        },
                        {
                            id: "63f6a7b8c9d0e1f2a3b4c5d6",
                            name: "Newsletter",
                            slug: "newsletter",
                            description: "Email newsletter tips and strategies",
                            visibility: "public",
                            url: "https://demo.ghost.io/tag/newsletter/"
                        },
                        {
                            id: "64a7b8c9d0e1f2a3b4c5d6e7",
                            name: "Design",
                            slug: "design",
                            description: null,
                            visibility: "public",
                            url: "https://demo.ghost.io/tag/design/"
                        }
                    ],
                    pagination: {
                        page: 1,
                        limit: 15,
                        pages: 1,
                        total: 5,
                        next: null,
                        prev: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_api_key",
                description: "Admin API Key is invalid",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Ghost authentication failed. Please check your Admin API Key.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Ghost rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listMembers",
        provider: "ghost",
        validCases: [
            {
                name: "list_all_members",
                description: "List members with default pagination",
                input: {
                    limit: 15,
                    page: 1
                },
                expectedOutput: {
                    members: [
                        {
                            id: sampleMemberId,
                            uuid: "e5f6a7b8-c9d0-41e2-f3a4-b5c6d7e8f9a0",
                            email: "sarah.johnson@example.com",
                            name: "Sarah Johnson",
                            status: "paid",
                            subscribed: true,
                            createdAt: "2024-01-15T09:00:00.000Z",
                            updatedAt: "2024-03-01T12:00:00.000Z"
                        },
                        {
                            id: sampleMemberId2,
                            uuid: "f6a7b8c9-d0e1-42f3-a4b5-c6d7e8f9a0b1",
                            email: "mike.chen@example.com",
                            name: "Mike Chen",
                            status: "free",
                            subscribed: true,
                            createdAt: "2024-02-20T14:00:00.000Z",
                            updatedAt: "2024-02-20T14:00:00.000Z"
                        },
                        {
                            id: "64b8c9d0e1f2a3b4c5d6e7f8",
                            uuid: "a7b8c9d0-e1f2-43a4-b5c6-d7e8f9a0b1c2",
                            email: "emma.davis@example.com",
                            name: "Emma Davis",
                            status: "paid",
                            subscribed: true,
                            createdAt: "2024-03-05T16:00:00.000Z",
                            updatedAt: "2024-03-10T08:00:00.000Z"
                        },
                        {
                            id: "64c9d0e1f2a3b4c5d6e7f8a9",
                            uuid: "b8c9d0e1-f2a3-44b5-c6d7-e8f9a0b1c2d3",
                            email: "james.wilson@example.com",
                            name: null,
                            status: "free",
                            subscribed: false,
                            createdAt: "2024-03-12T10:00:00.000Z",
                            updatedAt: "2024-03-12T10:00:00.000Z"
                        }
                    ],
                    pagination: {
                        page: 1,
                        limit: 15,
                        pages: 1,
                        total: 4,
                        next: null,
                        prev: null
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_filter",
                description: "Invalid NQL filter syntax",
                input: {
                    filter: "invalid[filter"
                },
                expectedError: {
                    type: "validation",
                    message: "Ghost validation error. Please check the request data.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: { limit: 15 },
                expectedError: {
                    type: "rate_limit",
                    message: "Ghost rate limit exceeded. Please try again later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getSiteInfo",
        provider: "ghost",
        validCases: [
            {
                name: "get_site_metadata",
                description: "Get site title, description, URL, and version",
                input: {},
                expectedOutput: {
                    title: "Ghost Demo Site",
                    description:
                        "A demo publication showcasing Ghost's publishing platform features",
                    logo: "https://demo.ghost.io/content/images/2024/03/ghost-logo.png",
                    url: "https://demo.ghost.io/",
                    version: "5.82.0"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_api_key",
                description: "Admin API Key is invalid",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Ghost authentication failed. Please check your Admin API Key.",
                    retryable: false
                }
            },
            {
                name: "site_unreachable",
                description: "Ghost site is unreachable",
                input: {},
                expectedError: {
                    type: "server_error",
                    message: "Failed to connect to Ghost site",
                    retryable: true
                }
            }
        ]
    }
];
