/**
 * Medium Provider Test Fixtures
 *
 * Comprehensive test data for Medium publishing platform operations including
 * posts, publications, users, images, and contributors.
 */

import type { TestFixture } from "../../../sandbox";

// Sample user IDs following Medium's ID format
const sampleUserId = "1a2b3c4d5e6f7890abcdef123456789012345";
const sampleUserId2 = "2b3c4d5e6f7890abcdef1234567890123456";
const sampleUserId3 = "3c4d5e6f7890abcdef12345678901234567";

// Sample publication IDs
const samplePublicationId = "b45c78d9e012f3456789abcdef012345";
const samplePublicationId2 = "c56d89e0f123456789abcdef01234567";

// Sample post IDs
const samplePostId = "d67e90f12345678abcdef0123456789012";

export const mediumFixtures: TestFixture[] = [
    {
        operationId: "getMe",
        provider: "medium",
        validCases: [
            {
                name: "get_authenticated_user",
                description: "Get the authenticated user's profile information",
                input: {},
                expectedOutput: {
                    id: sampleUserId,
                    username: "alexdev",
                    name: "Alex Chen",
                    url: "https://medium.com/@alexdev",
                    imageUrl: "https://miro.medium.com/fit/c/176/176/1*abc123def456ghi789jkl.jpeg"
                }
            }
        ],
        errorCases: [
            {
                name: "permission",
                description: "Invalid or expired authentication token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid or expired access token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for API requests",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few minutes.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createPost",
        provider: "medium",
        validCases: [
            {
                name: "create_public_markdown_post",
                description: "Create a public post with markdown content",
                input: {
                    authorId: sampleUserId,
                    title: "Building Scalable APIs with Node.js: A Practical Guide",
                    contentFormat: "markdown",
                    content: `# Building Scalable APIs with Node.js

When building production-ready APIs, scalability should be a primary concern from day one. In this guide, we'll explore battle-tested patterns for creating APIs that can handle millions of requests.

## Key Principles

1. **Stateless Design** - Keep your servers stateless to enable horizontal scaling
2. **Caching Strategy** - Implement multi-layer caching with Redis and CDN
3. **Database Optimization** - Use connection pooling and read replicas

## Code Example

\`\`\`javascript
const express = require('express');
const app = express();

app.get('/api/users/:id', cache('5m'), async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});
\`\`\`

## Conclusion

Building scalable APIs requires thoughtful architecture decisions upfront.`,
                    tags: ["nodejs", "api-development", "scalability"],
                    publishStatus: "public",
                    license: "all-rights-reserved",
                    notifyFollowers: true
                },
                expectedOutput: {
                    id: samplePostId,
                    title: "Building Scalable APIs with Node.js: A Practical Guide",
                    authorId: sampleUserId,
                    url: "https://medium.com/@alexdev/building-scalable-apis-with-nodejs-a-practical-guide-abc123def456",
                    publishStatus: "public",
                    publishedAt: "2024-03-15T10:30:00.000Z",
                    license: "all-rights-reserved",
                    tags: ["nodejs", "api-development", "scalability"]
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_author_id",
                description: "Author ID does not exist or is not accessible",
                input: {
                    authorId: "nonexistent-author-id-12345",
                    title: "Test Post",
                    contentFormat: "markdown",
                    content: "Test content",
                    publishStatus: "draft"
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found or not accessible",
                    retryable: false
                }
            },
            {
                name: "empty_content",
                description: "Post content is empty",
                input: {
                    authorId: sampleUserId,
                    title: "Empty Post",
                    contentFormat: "markdown",
                    content: "",
                    publishStatus: "draft"
                },
                expectedError: {
                    type: "validation",
                    message: "Post content cannot be empty",
                    retryable: false
                }
            },
            {
                name: "too_many_tags",
                description: "More than 5 tags provided",
                input: {
                    authorId: sampleUserId,
                    title: "Over-tagged Post",
                    contentFormat: "markdown",
                    content: "Content here",
                    tags: ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
                    publishStatus: "draft"
                },
                expectedError: {
                    type: "validation",
                    message: "Maximum of 5 tags allowed per post",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating posts",
                input: {
                    authorId: sampleUserId,
                    title: "Rate Limited Post",
                    contentFormat: "markdown",
                    content: "Content",
                    publishStatus: "draft"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few minutes.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createPublicationPost",
        provider: "medium",
        validCases: [
            {
                name: "create_public_publication_post",
                description: "Create a public post within a publication",
                input: {
                    publicationId: samplePublicationId,
                    title: "Introducing Our New Design System",
                    contentFormat: "markdown",
                    content: `# Introducing Our New Design System

We're excited to announce the launch of our new unified design system, built to streamline product development across all our teams.

## Why a Design System?

As our company grew, we noticed inconsistencies creeping into our products. Different teams were building similar components in different ways.

## Key Components

### Button Library
Our button components support multiple variants:
- Primary actions
- Secondary actions
- Destructive actions
- Ghost buttons

### Form Elements
Consistent, accessible form inputs with built-in validation states.

## Getting Started

Install the design system package:

\`\`\`bash
npm install @company/design-system
\`\`\`

Check out our documentation for more details.`,
                    tags: ["design-systems", "ui-design", "frontend"],
                    publishStatus: "public",
                    notifyFollowers: true
                },
                expectedOutput: {
                    id: "b12345678901234abcdef456789012345678",
                    title: "Introducing Our New Design System",
                    authorId: sampleUserId,
                    url: "https://medium.com/tech-insights-weekly/introducing-our-new-design-system-ghi789",
                    publishStatus: "public",
                    publishedAt: "2024-03-17T09:00:00.000Z",
                    license: "all-rights-reserved",
                    tags: ["design-systems", "ui-design", "frontend"]
                }
            }
        ],
        errorCases: [
            {
                name: "publication_not_found",
                description: "Publication ID does not exist",
                input: {
                    publicationId: "nonexistent-publication-id-12345",
                    title: "Test Post",
                    contentFormat: "markdown",
                    content: "Test content",
                    publishStatus: "draft"
                },
                expectedError: {
                    type: "not_found",
                    message: "Publication not found",
                    retryable: false
                }
            },
            {
                name: "not_a_contributor",
                description: "User is not a contributor to this publication",
                input: {
                    publicationId: samplePublicationId,
                    title: "Unauthorized Post",
                    contentFormat: "markdown",
                    content: "Content",
                    publishStatus: "public"
                },
                expectedError: {
                    type: "permission",
                    message: "User is not authorized to publish to this publication",
                    retryable: false
                }
            },
            {
                name: "invalid_canonical_url",
                description: "Canonical URL is not a valid URL",
                input: {
                    publicationId: samplePublicationId,
                    title: "Invalid Canonical",
                    contentFormat: "markdown",
                    content: "Content",
                    canonicalUrl: "not-a-valid-url",
                    publishStatus: "draft"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid canonical URL format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when creating publication posts",
                input: {
                    publicationId: samplePublicationId,
                    title: "Rate Limited",
                    contentFormat: "markdown",
                    content: "Content",
                    publishStatus: "draft"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few minutes.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPublications",
        provider: "medium",
        validCases: [
            {
                name: "get_user_publications",
                description: "Get all publications a user contributes to",
                input: {
                    userId: sampleUserId
                },
                expectedOutput: {
                    publications: [
                        {
                            id: samplePublicationId,
                            name: "Tech Insights Weekly",
                            description:
                                "A weekly publication covering the latest in software development, cloud infrastructure, and developer tools. Written by engineers, for engineers.",
                            url: "https://medium.com/tech-insights-weekly",
                            imageUrl:
                                "https://miro.medium.com/fit/c/400/400/1*tech-insights-logo-abc123.png"
                        },
                        {
                            id: samplePublicationId2,
                            name: "The Startup Chronicles",
                            description:
                                "Stories, insights, and lessons from the trenches of building startups. From seed to Series C and beyond.",
                            url: "https://medium.com/the-startup-chronicles",
                            imageUrl:
                                "https://miro.medium.com/fit/c/400/400/1*startup-chronicles-def456.png"
                        },
                        {
                            id: "e67890123456789abcdef789012345678901",
                            name: "Data Science Digest",
                            description:
                                "Machine learning tutorials, data engineering best practices, and AI research summaries for practitioners.",
                            url: "https://medium.com/data-science-digest",
                            imageUrl:
                                "https://miro.medium.com/fit/c/400/400/1*data-science-digest-ghi789.png"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "user_not_found",
                description: "User ID does not exist",
                input: {
                    userId: "nonexistent-user-id-12345678901234567"
                },
                expectedError: {
                    type: "not_found",
                    message: "User not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized_access",
                description: "Not authorized to view this user's publications",
                input: {
                    userId: "private-user-id-12345678901234567890"
                },
                expectedError: {
                    type: "permission",
                    message: "Not authorized to access this user's publications",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    userId: sampleUserId
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few minutes.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPublicationContributors",
        provider: "medium",
        validCases: [
            {
                name: "get_publication_contributors_multiple",
                description: "Get all contributors for a publication with various roles",
                input: {
                    publicationId: samplePublicationId
                },
                expectedOutput: {
                    contributors: [
                        {
                            publicationId: samplePublicationId,
                            userId: sampleUserId,
                            role: "editor"
                        },
                        {
                            publicationId: samplePublicationId,
                            userId: sampleUserId2,
                            role: "writer"
                        },
                        {
                            publicationId: samplePublicationId,
                            userId: sampleUserId3,
                            role: "writer"
                        },
                        {
                            publicationId: samplePublicationId,
                            userId: "4d5e6f7890abcdef1234567890123456789",
                            role: "editor"
                        },
                        {
                            publicationId: samplePublicationId,
                            userId: "5e6f78901abcdef2345678901234567890a",
                            role: "writer"
                        }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "publication_not_found",
                description: "Publication ID does not exist",
                input: {
                    publicationId: "nonexistent-publication-id-123456"
                },
                expectedError: {
                    type: "not_found",
                    message: "Publication not found",
                    retryable: false
                }
            },
            {
                name: "unauthorized_access",
                description: "Not authorized to view publication contributors",
                input: {
                    publicationId: "private-publication-id-1234567890"
                },
                expectedError: {
                    type: "permission",
                    message: "Not authorized to view this publication's contributors",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    publicationId: samplePublicationId
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few minutes.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "uploadImage",
        provider: "medium",
        validCases: [
            {
                name: "upload_jpeg_image",
                description: "Upload a JPEG image for use in posts",
                input: {
                    imageBase64:
                        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
                    contentType: "image/jpeg"
                },
                expectedOutput: {
                    url: "https://miro.medium.com/max/1400/1*abc123def456ghi789jkl.jpeg",
                    md5: "d41d8cd98f00b204e9800998ecf8427e"
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_image_data",
                description: "Base64 data is not a valid image",
                input: {
                    imageBase64: "not-valid-base64-image-data!!!",
                    contentType: "image/png"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid image data. Please provide valid base64-encoded image.",
                    retryable: false
                }
            },
            {
                name: "unsupported_content_type",
                description: "Image content type is not supported",
                input: {
                    imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAA",
                    contentType: "image/webp" as "image/png"
                },
                expectedError: {
                    type: "validation",
                    message: "Unsupported image format. Supported formats: PNG, JPEG, GIF, TIFF.",
                    retryable: false
                }
            },
            {
                name: "image_too_large",
                description: "Image file size exceeds maximum allowed",
                input: {
                    imageBase64: "A".repeat(10000000),
                    contentType: "image/jpeg"
                },
                expectedError: {
                    type: "validation",
                    message: "Image size exceeds maximum allowed (5MB)",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded for image uploads",
                input: {
                    imageBase64:
                        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    contentType: "image/png"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry after a few minutes.",
                    retryable: true
                }
            },
            {
                name: "server_error",
                description: "Server error during image processing",
                input: {
                    imageBase64: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
                    contentType: "image/gif"
                },
                expectedError: {
                    type: "server_error",
                    message: "Failed to upload image. Please try again.",
                    retryable: true
                }
            }
        ]
    }
];
