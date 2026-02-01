/**
 * Sentry Provider Test Fixtures
 *
 * Based on Sentry API documentation for error tracking and monitoring
 */

import type { TestFixture } from "../../../sandbox";

/**
 * Sample issues for filterableData
 */
const sampleIssues = [
    {
        id: "1234567890",
        shortId: "FRONTEND-1A2B",
        title: "TypeError: Cannot read property 'map' of undefined",
        culprit: "components/UserList.tsx in renderUsers",
        level: "error",
        status: "unresolved",
        platform: "javascript",
        project: { id: "proj_001", name: "frontend-app", slug: "frontend-app" },
        count: 1523,
        userCount: 342,
        firstSeen: "2024-01-15T08:30:00Z",
        lastSeen: "2024-02-01T14:22:00Z",
        isBookmarked: false,
        isSubscribed: true,
        hasSeen: true,
        _projectSlug: "frontend-app",
        _status: "unresolved"
    },
    {
        id: "2345678901",
        shortId: "BACKEND-2C3D",
        title: "ConnectionRefusedError: Connection to database failed",
        culprit: "services/database.py in connect",
        level: "fatal",
        status: "unresolved",
        platform: "python",
        project: { id: "proj_002", name: "backend-api", slug: "backend-api" },
        count: 89,
        userCount: 45,
        firstSeen: "2024-01-20T12:00:00Z",
        lastSeen: "2024-02-01T10:15:00Z",
        isBookmarked: true,
        isSubscribed: true,
        hasSeen: false,
        _projectSlug: "backend-api",
        _status: "unresolved"
    },
    {
        id: "3456789012",
        shortId: "FRONTEND-3E4F",
        title: "ReferenceError: user is not defined",
        culprit: "pages/Profile.tsx in getProfile",
        level: "error",
        status: "resolved",
        platform: "javascript",
        project: { id: "proj_001", name: "frontend-app", slug: "frontend-app" },
        count: 234,
        userCount: 78,
        firstSeen: "2024-01-10T09:00:00Z",
        lastSeen: "2024-01-25T16:30:00Z",
        isBookmarked: false,
        isSubscribed: false,
        hasSeen: true,
        _projectSlug: "frontend-app",
        _status: "resolved"
    },
    {
        id: "4567890123",
        shortId: "MOBILE-4G5H",
        title: "NullPointerException in UserActivity.onCreate",
        culprit: "com.app.activities.UserActivity in onCreate",
        level: "error",
        status: "ignored",
        platform: "java",
        project: { id: "proj_003", name: "mobile-android", slug: "mobile-android" },
        count: 567,
        userCount: 123,
        firstSeen: "2024-01-05T11:00:00Z",
        lastSeen: "2024-01-30T08:45:00Z",
        isBookmarked: false,
        isSubscribed: false,
        hasSeen: true,
        _projectSlug: "mobile-android",
        _status: "ignored"
    }
];

/**
 * Sample projects for filterableData
 */
const sampleProjects = [
    {
        id: "proj_001",
        slug: "frontend-app",
        name: "Frontend App",
        platform: "javascript-react",
        dateCreated: "2023-06-15T10:00:00Z",
        organization: { id: "org_001", slug: "acme-corp", name: "Acme Corporation" }
    },
    {
        id: "proj_002",
        slug: "backend-api",
        name: "Backend API",
        platform: "python-fastapi",
        dateCreated: "2023-06-15T10:00:00Z",
        organization: { id: "org_001", slug: "acme-corp", name: "Acme Corporation" }
    },
    {
        id: "proj_003",
        slug: "mobile-android",
        name: "Mobile Android",
        platform: "android",
        dateCreated: "2023-08-01T14:30:00Z",
        organization: { id: "org_001", slug: "acme-corp", name: "Acme Corporation" }
    }
];

/**
 * Sample organizations for filterableData
 */
const sampleOrganizations = [
    {
        id: "org_001",
        slug: "acme-corp",
        name: "Acme Corporation",
        dateCreated: "2023-01-01T00:00:00Z",
        status: "active"
    },
    {
        id: "org_002",
        slug: "startup-inc",
        name: "Startup Inc",
        dateCreated: "2023-06-01T00:00:00Z",
        status: "active"
    }
];

/**
 * Sample releases for filterableData
 */
const sampleReleases = [
    {
        version: "v2.5.0",
        shortVersion: "2.5.0",
        ref: "abc123def456789",
        url: "https://github.com/acme/frontend/releases/tag/v2.5.0",
        dateCreated: "2024-01-28T10:00:00Z",
        dateReleased: "2024-01-28T14:00:00Z",
        projects: [{ id: "proj_001", slug: "frontend-app", name: "Frontend App" }]
    },
    {
        version: "v2.4.2",
        shortVersion: "2.4.2",
        ref: "def456abc789012",
        url: "https://github.com/acme/frontend/releases/tag/v2.4.2",
        dateCreated: "2024-01-15T09:00:00Z",
        dateReleased: "2024-01-15T12:00:00Z",
        projects: [{ id: "proj_001", slug: "frontend-app", name: "Frontend App" }]
    },
    {
        version: "v1.8.0",
        shortVersion: "1.8.0",
        ref: "ghi789jkl012345",
        url: "https://github.com/acme/backend/releases/tag/v1.8.0",
        dateCreated: "2024-01-20T11:00:00Z",
        dateReleased: "2024-01-20T15:30:00Z",
        projects: [{ id: "proj_002", slug: "backend-api", name: "Backend API" }]
    }
];

export const sentryFixtures: TestFixture[] = [
    {
        operationId: "listOrganizations",
        provider: "sentry",
        filterableData: {
            records: sampleOrganizations,
            recordsField: "organizations",
            offsetField: "nextCursor",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["status", "name"]
            }
        },
        validCases: [
            {
                name: "list_all_organizations",
                description: "List all organizations accessible to the token",
                input: {}
            }
        ],
        errorCases: [
            {
                name: "unauthorized",
                description: "Invalid or expired API token",
                input: {},
                expectedError: {
                    type: "permission",
                    message: "Invalid authentication token",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {},
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listProjects",
        provider: "sentry",
        filterableData: {
            records: sampleProjects,
            recordsField: "projects",
            offsetField: "nextCursor",
            defaultPageSize: 100,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["platform", "name"]
            }
        },
        validCases: [
            {
                name: "list_all_projects",
                description: "List all projects in an organization",
                input: {
                    organizationSlug: "acme-corp"
                }
            },
            {
                name: "list_projects_with_cursor",
                description: "List projects with pagination cursor",
                input: {
                    organizationSlug: "acme-corp",
                    cursor: "cursor_abc123"
                }
            }
        ],
        errorCases: [
            {
                name: "org_not_found",
                description: "Organization does not exist",
                input: {
                    organizationSlug: "nonexistent-org"
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    organizationSlug: "acme-corp"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getProject",
        provider: "sentry",
        validCases: [
            {
                name: "get_project_details",
                description: "Get details of a specific project",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "frontend-app"
                },
                expectedOutput: {
                    id: "proj_001",
                    slug: "frontend-app",
                    name: "Frontend App",
                    platform: "javascript-react",
                    dateCreated: "2023-06-15T10:00:00Z",
                    organization: {
                        id: "org_001",
                        slug: "acme-corp",
                        name: "Acme Corporation"
                    }
                }
            },
            {
                name: "get_backend_project",
                description: "Get backend project details",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "backend-api"
                },
                expectedOutput: {
                    id: "proj_002",
                    slug: "backend-api",
                    name: "Backend API",
                    platform: "python-fastapi",
                    dateCreated: "2023-06-15T10:00:00Z",
                    organization: {
                        id: "org_001",
                        slug: "acme-corp",
                        name: "Acme Corporation"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Project does not exist",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "nonexistent-project"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "frontend-app"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listIssues",
        provider: "sentry",
        filterableData: {
            records: sampleIssues,
            recordsField: "issues",
            offsetField: "nextCursor",
            defaultPageSize: 25,
            maxPageSize: 100,
            pageSizeParam: "limit",
            filterConfig: {
                type: "generic",
                filterableFields: ["_projectSlug", "_status", "level", "platform"]
            }
        },
        validCases: [
            {
                name: "list_unresolved_issues",
                description: "List unresolved issues for an organization",
                input: {
                    organizationSlug: "acme-corp",
                    query: "is:unresolved"
                }
            },
            {
                name: "list_issues_for_project",
                description: "List issues for a specific project",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "frontend-app",
                    statsPeriod: "24h"
                }
            },
            {
                name: "list_issues_sorted_by_frequency",
                description: "List issues sorted by frequency",
                input: {
                    organizationSlug: "acme-corp",
                    sort: "freq",
                    statsPeriod: "14d"
                }
            }
        ],
        errorCases: [
            {
                name: "org_not_found",
                description: "Organization does not exist",
                input: {
                    organizationSlug: "nonexistent-org"
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    organizationSlug: "acme-corp"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getIssue",
        provider: "sentry",
        validCases: [
            {
                name: "get_issue_full_details",
                description: "Get full details of an issue",
                input: {
                    issueId: "1234567890"
                },
                expectedOutput: {
                    id: "1234567890",
                    shortId: "FRONTEND-1A2B",
                    title: "TypeError: Cannot read property 'map' of undefined",
                    culprit: "components/UserList.tsx in renderUsers",
                    permalink: "https://sentry.io/organizations/acme-corp/issues/1234567890/",
                    level: "error",
                    status: "unresolved",
                    statusDetails: {},
                    isPublic: false,
                    platform: "javascript",
                    project: { id: "proj_001", name: "frontend-app", slug: "frontend-app" },
                    type: "error",
                    metadata: {
                        type: "TypeError",
                        value: "Cannot read property 'map' of undefined"
                    },
                    numComments: 3,
                    assignedTo: null,
                    isBookmarked: false,
                    isSubscribed: true,
                    hasSeen: true,
                    isUnhandled: true,
                    count: 1523,
                    userCount: 342,
                    firstSeen: "2024-01-15T08:30:00Z",
                    lastSeen: "2024-02-01T14:22:00Z"
                }
            },
            {
                name: "get_assigned_issue",
                description: "Get issue that is assigned to a user",
                input: {
                    issueId: "2345678901"
                },
                expectedOutput: {
                    id: "2345678901",
                    shortId: "BACKEND-2C3D",
                    title: "ConnectionRefusedError: Connection to database failed",
                    culprit: "services/database.py in connect",
                    permalink: "https://sentry.io/organizations/acme-corp/issues/2345678901/",
                    level: "fatal",
                    status: "unresolved",
                    statusDetails: {},
                    isPublic: false,
                    platform: "python",
                    project: { id: "proj_002", name: "backend-api", slug: "backend-api" },
                    type: "error",
                    metadata: {
                        type: "ConnectionRefusedError",
                        value: "Connection to database failed"
                    },
                    numComments: 5,
                    assignedTo: {
                        type: "user",
                        id: "user_001",
                        name: "John Developer",
                        email: "john@acme-corp.com"
                    },
                    isBookmarked: true,
                    isSubscribed: true,
                    hasSeen: false,
                    isUnhandled: true,
                    count: 89,
                    userCount: 45,
                    firstSeen: "2024-01-20T12:00:00Z",
                    lastSeen: "2024-02-01T10:15:00Z"
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Issue does not exist",
                input: {
                    issueId: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Issue not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    issueId: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateIssue",
        provider: "sentry",
        validCases: [
            {
                name: "resolve_issue",
                description: "Mark an issue as resolved",
                input: {
                    issueId: "1234567890",
                    status: "resolved"
                },
                expectedOutput: {
                    id: "1234567890",
                    shortId: "FRONTEND-1A2B",
                    title: "TypeError: Cannot read property 'map' of undefined",
                    status: "resolved",
                    assignedTo: undefined,
                    hasSeen: true,
                    isBookmarked: false
                }
            },
            {
                name: "ignore_issue",
                description: "Ignore an issue",
                input: {
                    issueId: "4567890123",
                    status: "ignored"
                },
                expectedOutput: {
                    id: "4567890123",
                    shortId: "MOBILE-4G5H",
                    title: "NullPointerException in UserActivity.onCreate",
                    status: "ignored",
                    assignedTo: undefined,
                    hasSeen: true,
                    isBookmarked: false
                }
            },
            {
                name: "assign_and_bookmark_issue",
                description: "Assign issue to user and bookmark it",
                input: {
                    issueId: "2345678901",
                    assignedTo: "user_001",
                    isBookmarked: true,
                    hasSeen: true
                },
                expectedOutput: {
                    id: "2345678901",
                    shortId: "BACKEND-2C3D",
                    title: "ConnectionRefusedError: Connection to database failed",
                    status: "unresolved",
                    assignedTo: "John Developer",
                    hasSeen: true,
                    isBookmarked: true
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Issue does not exist",
                input: {
                    issueId: "9999999999",
                    status: "resolved"
                },
                expectedError: {
                    type: "not_found",
                    message: "Issue not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    issueId: "1234567890",
                    status: "resolved"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listIssueEvents",
        provider: "sentry",
        validCases: [
            {
                name: "list_events_for_issue",
                description: "List events for a specific issue",
                input: {
                    issueId: "1234567890"
                },
                expectedOutput: {
                    events: [
                        {
                            id: "evt_abc123",
                            eventId: "abc123def456789012345678abcdef01",
                            dateCreated: "2024-02-01T14:22:00Z",
                            message: "TypeError: Cannot read property 'map' of undefined",
                            title: "TypeError: Cannot read property 'map' of undefined",
                            platform: "javascript",
                            user: {
                                id: "user_12345",
                                email: "customer@example.com",
                                username: "customer123",
                                ipAddress: "192.168.1.100"
                            },
                            tags: [
                                { key: "browser", value: "Chrome 120.0" },
                                { key: "os", value: "Windows 10" },
                                { key: "environment", value: "production" }
                            ]
                        },
                        {
                            id: "evt_def456",
                            eventId: "def456abc789012345678901bcdef234",
                            dateCreated: "2024-02-01T13:45:00Z",
                            message: "TypeError: Cannot read property 'map' of undefined",
                            title: "TypeError: Cannot read property 'map' of undefined",
                            platform: "javascript",
                            user: {
                                id: "user_67890",
                                email: "another@example.com",
                                ipAddress: "10.0.0.50"
                            },
                            tags: [
                                { key: "browser", value: "Firefox 121.0" },
                                { key: "os", value: "macOS 14.2" },
                                { key: "environment", value: "production" }
                            ]
                        }
                    ],
                    count: 2
                }
            },
            {
                name: "list_events_limited",
                description: "List limited events for an issue",
                input: {
                    issueId: "2345678901",
                    full: false
                },
                expectedOutput: {
                    events: [
                        {
                            id: "evt_ghi789",
                            eventId: "ghi789jkl012345678901234cdef5678",
                            dateCreated: "2024-02-01T10:15:00Z",
                            message: "ConnectionRefusedError: Connection to database failed",
                            title: "ConnectionRefusedError: Connection to database failed",
                            platform: "python"
                        }
                    ],
                    count: 1
                }
            }
        ],
        errorCases: [
            {
                name: "not_found",
                description: "Issue does not exist",
                input: {
                    issueId: "9999999999"
                },
                expectedError: {
                    type: "not_found",
                    message: "Issue not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    issueId: "1234567890"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "createRelease",
        provider: "sentry",
        validCases: [
            {
                name: "create_release_basic",
                description: "Create a new release with minimal fields",
                input: {
                    organizationSlug: "acme-corp",
                    version: "v2.6.0",
                    projects: ["frontend-app"]
                },
                expectedOutput: {
                    version: "v2.6.0",
                    shortVersion: "2.6.0",
                    ref: undefined,
                    url: undefined,
                    dateCreated: "2024-02-01T15:00:00Z",
                    dateReleased: undefined,
                    projects: [{ id: "proj_001", slug: "frontend-app", name: "Frontend App" }]
                }
            },
            {
                name: "create_release_full",
                description: "Create a release with all fields",
                input: {
                    organizationSlug: "acme-corp",
                    version: "v1.9.0",
                    projects: ["backend-api"],
                    dateReleased: "2024-02-01T16:00:00Z",
                    ref: "jkl012mno345678",
                    url: "https://github.com/acme/backend/releases/tag/v1.9.0"
                },
                expectedOutput: {
                    version: "v1.9.0",
                    shortVersion: "1.9.0",
                    ref: "jkl012mno345678",
                    url: "https://github.com/acme/backend/releases/tag/v1.9.0",
                    dateCreated: "2024-02-01T15:30:00Z",
                    dateReleased: "2024-02-01T16:00:00Z",
                    projects: [{ id: "proj_002", slug: "backend-api", name: "Backend API" }]
                }
            },
            {
                name: "create_release_multiple_projects",
                description: "Create a release for multiple projects",
                input: {
                    organizationSlug: "acme-corp",
                    version: "v3.0.0",
                    projects: ["frontend-app", "backend-api", "mobile-android"]
                },
                expectedOutput: {
                    version: "v3.0.0",
                    shortVersion: "3.0.0",
                    ref: undefined,
                    url: undefined,
                    dateCreated: "2024-02-01T16:00:00Z",
                    dateReleased: undefined,
                    projects: [
                        { id: "proj_001", slug: "frontend-app", name: "Frontend App" },
                        { id: "proj_002", slug: "backend-api", name: "Backend API" },
                        { id: "proj_003", slug: "mobile-android", name: "Mobile Android" }
                    ]
                }
            }
        ],
        errorCases: [
            {
                name: "org_not_found",
                description: "Organization does not exist",
                input: {
                    organizationSlug: "nonexistent-org",
                    version: "v1.0.0",
                    projects: ["frontend-app"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    organizationSlug: "acme-corp",
                    version: "v1.0.0",
                    projects: ["nonexistent-project"]
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    organizationSlug: "acme-corp",
                    version: "v1.0.0",
                    projects: ["frontend-app"]
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listReleases",
        provider: "sentry",
        filterableData: {
            records: sampleReleases,
            recordsField: "releases",
            offsetField: "nextCursor",
            defaultPageSize: 50,
            maxPageSize: 100,
            pageSizeParam: "perPage",
            filterConfig: {
                type: "generic",
                filterableFields: ["version"]
            }
        },
        validCases: [
            {
                name: "list_all_releases",
                description: "List all releases for an organization",
                input: {
                    organizationSlug: "acme-corp"
                }
            },
            {
                name: "list_releases_for_project",
                description: "List releases for a specific project",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "frontend-app"
                }
            }
        ],
        errorCases: [
            {
                name: "org_not_found",
                description: "Organization does not exist",
                input: {
                    organizationSlug: "nonexistent-org"
                },
                expectedError: {
                    type: "not_found",
                    message: "Organization not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    organizationSlug: "acme-corp"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listAlertRules",
        provider: "sentry",
        validCases: [
            {
                name: "list_alert_rules",
                description: "List alert rules for a project",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "frontend-app"
                },
                expectedOutput: {
                    alertRules: [
                        {
                            id: "alert_001",
                            name: "High Error Volume",
                            dateCreated: "2023-07-01T10:00:00Z",
                            status: "active",
                            environment: "production",
                            frequency: 300
                        },
                        {
                            id: "alert_002",
                            name: "Critical Errors",
                            dateCreated: "2023-07-15T14:00:00Z",
                            status: "active",
                            environment: null,
                            frequency: 60
                        },
                        {
                            id: "alert_003",
                            name: "Staging Errors",
                            dateCreated: "2023-08-01T09:00:00Z",
                            status: "disabled",
                            environment: "staging",
                            frequency: 1800
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "list_alert_rules_backend",
                description: "List alert rules for backend project",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "backend-api"
                },
                expectedOutput: {
                    alertRules: [
                        {
                            id: "alert_004",
                            name: "Database Connection Failures",
                            dateCreated: "2023-06-20T11:00:00Z",
                            status: "active",
                            environment: "production",
                            frequency: 60
                        },
                        {
                            id: "alert_005",
                            name: "API Latency Spike",
                            dateCreated: "2023-09-10T15:30:00Z",
                            status: "active",
                            environment: "production",
                            frequency: 300
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "nonexistent-project"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded",
                input: {
                    organizationSlug: "acme-corp",
                    projectSlug: "frontend-app"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded. Please retry later.",
                    retryable: true
                }
            }
        ]
    }
];
