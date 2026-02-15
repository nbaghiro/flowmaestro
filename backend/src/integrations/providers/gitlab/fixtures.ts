/**
 * GitLab Provider Test Fixtures
 *
 * Based on official GitLab REST API v4 documentation:
 * - Projects: https://docs.gitlab.com/ee/api/projects.html
 * - Issues: https://docs.gitlab.com/ee/api/issues.html
 * - Merge Requests: https://docs.gitlab.com/ee/api/merge_requests.html
 * - Pipelines: https://docs.gitlab.com/ee/api/pipelines.html
 */

import type { TestFixture } from "../../sandbox";

export const gitlabFixtures: TestFixture[] = [
    // ============================================================
    // ISSUE OPERATIONS
    // ============================================================
    {
        operationId: "createIssue",
        provider: "gitlab",
        validCases: [
            {
                name: "basic_issue",
                description: "Create a basic issue with title and description",
                input: {
                    project_id: "12345678",
                    title: "Bug: Application crashes on startup",
                    description:
                        "## Description\n\nThe application crashes immediately after launching on macOS Sonoma.\n\n## Steps to Reproduce\n\n1. Install the application\n2. Launch from Applications folder\n3. Observe crash\n\n## Expected Behavior\n\nApplication should start normally."
                },
                expectedOutput: {
                    id: 98765432,
                    iid: 42,
                    project_id: 12345678,
                    title: "Bug: Application crashes on startup",
                    description:
                        "## Description\n\nThe application crashes immediately after launching on macOS Sonoma.\n\n## Steps to Reproduce\n\n1. Install the application\n2. Launch from Applications folder\n3. Observe crash\n\n## Expected Behavior\n\nApplication should start normally.",
                    state: "opened",
                    labels: [],
                    author: {
                        id: 1001,
                        username: "jdeveloper",
                        name: "Jane Developer"
                    },
                    assignees: [],
                    created_at: "2024-01-15T10:30:00.000Z",
                    web_url: "https://gitlab.com/acme-corp/backend-api/-/issues/42"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    project_id: "nonexistent%2Fproject",
                    title: "Test Issue"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Project Not Found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to create issues in this project",
                input: {
                    project_id: "private-org%2Finternal-repo",
                    title: "Test Issue"
                },
                expectedError: {
                    type: "permission",
                    message: "403 Forbidden",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    title: "Test Issue"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getIssue",
        provider: "gitlab",
        validCases: [
            {
                name: "basic_get_issue",
                description: "Get details of a specific issue",
                input: {
                    project_id: "12345678",
                    issue_iid: 42
                },
                expectedOutput: {
                    id: 98765432,
                    iid: 42,
                    project_id: 12345678,
                    title: "Bug: Application crashes on startup",
                    description:
                        "## Description\n\nThe application crashes immediately after launching on macOS Sonoma.",
                    state: "opened",
                    labels: ["bug", "critical"],
                    author: {
                        id: 1001,
                        username: "jdeveloper",
                        name: "Jane Developer",
                        avatar_url:
                            "https://gitlab.com/uploads/-/system/user/avatar/1001/avatar.png"
                    },
                    assignees: [
                        {
                            id: 1002,
                            username: "msmith",
                            name: "Mike Smith",
                            avatar_url:
                                "https://gitlab.com/uploads/-/system/user/avatar/1002/avatar.png"
                        }
                    ],
                    milestone: {
                        id: 5001,
                        iid: 3,
                        title: "v2.1.0",
                        state: "active",
                        due_date: "2024-03-01"
                    },
                    created_at: "2024-01-15T10:30:00.000Z",
                    updated_at: "2024-01-16T09:15:00.000Z",
                    closed_at: null,
                    closed_by: null,
                    due_date: "2024-02-01",
                    confidential: false,
                    web_url: "https://gitlab.com/acme-corp/backend-api/-/issues/42",
                    upvotes: 5,
                    downvotes: 0,
                    user_notes_count: 3,
                    merge_requests_count: 1,
                    time_stats: {
                        time_estimate: 14400,
                        total_time_spent: 7200
                    },
                    task_completion_status: {
                        count: 3,
                        completed_count: 1
                    },
                    weight: 5,
                    references: {
                        short: "#42",
                        relative: "#42",
                        full: "acme-corp/backend-api#42"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                description: "Issue does not exist",
                input: {
                    project_id: "12345678",
                    issue_iid: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Issue Not Found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    issue_iid: 42
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listIssues",
        provider: "gitlab",
        validCases: [
            {
                name: "list_open_issues",
                description: "List all open issues in a project",
                input: {
                    project_id: "12345678",
                    state: "opened"
                },
                expectedOutput: {
                    issues: [
                        {
                            id: 98765432,
                            iid: 42,
                            title: "Bug: Application crashes on startup",
                            description: "The application crashes immediately after launching.",
                            state: "opened",
                            labels: ["bug", "critical"],
                            author: {
                                id: 1001,
                                username: "jdeveloper",
                                name: "Jane Developer"
                            },
                            assignees: [
                                {
                                    id: 1002,
                                    username: "msmith",
                                    name: "Mike Smith"
                                }
                            ],
                            milestone: {
                                id: 5001,
                                title: "v2.1.0"
                            },
                            created_at: "2024-01-15T10:30:00.000Z",
                            updated_at: "2024-01-16T09:15:00.000Z",
                            closed_at: null,
                            due_date: "2024-02-01",
                            web_url: "https://gitlab.com/acme-corp/backend-api/-/issues/42",
                            upvotes: 5,
                            downvotes: 0,
                            user_notes_count: 3
                        },
                        {
                            id: 98765433,
                            iid: 43,
                            title: "Feature: Implement OAuth2 authentication",
                            description: "Add support for OAuth2 authentication flow.",
                            state: "opened",
                            labels: ["feature", "security"],
                            author: {
                                id: 1001,
                                username: "jdeveloper",
                                name: "Jane Developer"
                            },
                            assignees: [],
                            milestone: null,
                            created_at: "2024-01-15T11:00:00.000Z",
                            updated_at: "2024-01-15T11:00:00.000Z",
                            closed_at: null,
                            due_date: "2024-02-28",
                            web_url: "https://gitlab.com/acme-corp/backend-api/-/issues/43",
                            upvotes: 2,
                            downvotes: 0,
                            user_notes_count: 1
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
                    project_id: "nonexistent%2Fproject"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Project Not Found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateIssue",
        provider: "gitlab",
        validCases: [
            {
                name: "update_title_and_description",
                description: "Update issue title and description",
                input: {
                    project_id: "12345678",
                    issue_iid: 42,
                    title: "Bug: Application crashes on startup (macOS)",
                    description:
                        "## Description\n\nThe application crashes immediately after launching on macOS Sonoma.\n\n## Root Cause\n\nIncompatible OpenGL version detection."
                },
                expectedOutput: {
                    id: 98765432,
                    iid: 42,
                    project_id: 12345678,
                    title: "Bug: Application crashes on startup (macOS)",
                    description:
                        "## Description\n\nThe application crashes immediately after launching on macOS Sonoma.\n\n## Root Cause\n\nIncompatible OpenGL version detection.",
                    state: "opened",
                    labels: ["bug", "critical"],
                    author: {
                        id: 1001,
                        username: "jdeveloper",
                        name: "Jane Developer"
                    },
                    assignees: [
                        {
                            id: 1002,
                            username: "msmith",
                            name: "Mike Smith"
                        }
                    ],
                    updated_at: "2024-01-17T14:00:00.000Z",
                    closed_at: null,
                    web_url: "https://gitlab.com/acme-corp/backend-api/-/issues/42"
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                description: "Issue does not exist",
                input: {
                    project_id: "12345678",
                    issue_iid: 99999,
                    title: "Updated Title"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Issue Not Found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to update this issue",
                input: {
                    project_id: "other-org%2Frepo",
                    issue_iid: 1,
                    title: "Updated Title"
                },
                expectedError: {
                    type: "permission",
                    message: "403 Forbidden",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    issue_iid: 42,
                    title: "Updated Title"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================
    // MERGE REQUEST OPERATIONS
    // ============================================================
    {
        operationId: "createMergeRequest",
        provider: "gitlab",
        validCases: [
            {
                name: "basic_merge_request",
                description: "Create a basic merge request",
                input: {
                    project_id: "12345678",
                    source_branch: "feature/add-user-authentication",
                    target_branch: "main",
                    title: "Add user authentication module"
                },
                expectedOutput: {
                    id: 87654321,
                    iid: 156,
                    project_id: 12345678,
                    title: "Add user authentication module",
                    description: null,
                    state: "opened",
                    source_branch: "feature/add-user-authentication",
                    target_branch: "main",
                    author: {
                        id: 1001,
                        username: "jdeveloper",
                        name: "Jane Developer"
                    },
                    assignees: [],
                    reviewers: [],
                    draft: false,
                    created_at: "2024-01-20T09:00:00.000Z",
                    web_url: "https://gitlab.com/acme-corp/backend-api/-/merge_requests/156"
                }
            }
        ],
        errorCases: [
            {
                name: "branch_not_found",
                description: "Source branch does not exist",
                input: {
                    project_id: "12345678",
                    source_branch: "nonexistent-branch",
                    target_branch: "main",
                    title: "Test MR"
                },
                expectedError: {
                    type: "validation",
                    message: "Source branch does not exist",
                    retryable: false
                }
            },
            {
                name: "duplicate_merge_request",
                description: "Merge request already exists for these branches",
                input: {
                    project_id: "12345678",
                    source_branch: "feature/existing",
                    target_branch: "main",
                    title: "Duplicate MR"
                },
                expectedError: {
                    type: "validation",
                    message: "Another open merge request already exists for this source branch",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    source_branch: "feature/test",
                    target_branch: "main",
                    title: "Test MR"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getMergeRequest",
        provider: "gitlab",
        validCases: [
            {
                name: "open_merge_request",
                description: "Get details of an open merge request",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 156
                },
                expectedOutput: {
                    id: 87654321,
                    iid: 156,
                    project_id: 12345678,
                    title: "Add user authentication module",
                    description:
                        "This MR adds a complete user authentication module with JWT support.",
                    state: "opened",
                    source_branch: "feature/add-user-authentication",
                    target_branch: "main",
                    source_project_id: 12345678,
                    target_project_id: 12345678,
                    author: {
                        id: 1001,
                        username: "jdeveloper",
                        name: "Jane Developer",
                        avatar_url:
                            "https://gitlab.com/uploads/-/system/user/avatar/1001/avatar.png"
                    },
                    assignees: [
                        {
                            id: 1001,
                            username: "jdeveloper",
                            name: "Jane Developer",
                            avatar_url:
                                "https://gitlab.com/uploads/-/system/user/avatar/1001/avatar.png"
                        }
                    ],
                    reviewers: [
                        {
                            id: 1002,
                            username: "msmith",
                            name: "Mike Smith",
                            avatar_url:
                                "https://gitlab.com/uploads/-/system/user/avatar/1002/avatar.png"
                        }
                    ],
                    labels: ["feature", "needs-review"],
                    milestone: {
                        id: 5001,
                        iid: 3,
                        title: "v2.1.0",
                        state: "active"
                    },
                    draft: false,
                    merge_status: "can_be_merged",
                    has_conflicts: false,
                    blocking_discussions_resolved: true,
                    mergeable: true,
                    sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
                    merge_commit_sha: null,
                    squash_commit_sha: null,
                    squash: false,
                    created_at: "2024-01-20T09:00:00.000Z",
                    updated_at: "2024-01-21T14:30:00.000Z",
                    merged_at: null,
                    merged_by: null,
                    closed_at: null,
                    closed_by: null,
                    web_url: "https://gitlab.com/acme-corp/backend-api/-/merge_requests/156",
                    user_notes_count: 5,
                    upvotes: 2,
                    downvotes: 0,
                    time_stats: {
                        time_estimate: 28800,
                        total_time_spent: 14400
                    },
                    task_completion_status: {
                        count: 4,
                        completed_count: 3
                    },
                    references: {
                        short: "!156",
                        relative: "!156",
                        full: "acme-corp/backend-api!156"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "merge_request_not_found",
                description: "Merge request does not exist",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Merge Request Not Found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 156
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listMergeRequests",
        provider: "gitlab",
        validCases: [
            {
                name: "list_open_merge_requests",
                description: "List all open merge requests",
                input: {
                    project_id: "12345678",
                    state: "opened"
                },
                expectedOutput: {
                    merge_requests: [
                        {
                            id: 87654321,
                            iid: 156,
                            title: "Add user authentication module",
                            description: "Adds JWT-based authentication",
                            state: "opened",
                            source_branch: "feature/add-user-authentication",
                            target_branch: "main",
                            author: {
                                id: 1001,
                                username: "jdeveloper",
                                name: "Jane Developer"
                            },
                            assignees: [
                                {
                                    id: 1001,
                                    username: "jdeveloper",
                                    name: "Jane Developer"
                                }
                            ],
                            reviewers: [
                                {
                                    id: 1002,
                                    username: "msmith",
                                    name: "Mike Smith"
                                }
                            ],
                            labels: ["feature", "needs-review"],
                            draft: false,
                            merge_status: "can_be_merged",
                            has_conflicts: false,
                            created_at: "2024-01-20T09:00:00.000Z",
                            updated_at: "2024-01-21T14:30:00.000Z",
                            merged_at: null,
                            web_url:
                                "https://gitlab.com/acme-corp/backend-api/-/merge_requests/156",
                            user_notes_count: 5
                        },
                        {
                            id: 87654322,
                            iid: 157,
                            title: "Implement OAuth2 authentication",
                            description: "OAuth2 with Google and GitHub",
                            state: "opened",
                            source_branch: "feature/oauth2-integration",
                            target_branch: "develop",
                            author: {
                                id: 1001,
                                username: "jdeveloper",
                                name: "Jane Developer"
                            },
                            assignees: [],
                            reviewers: [
                                {
                                    id: 1002,
                                    username: "msmith",
                                    name: "Mike Smith"
                                },
                                {
                                    id: 1003,
                                    username: "alee",
                                    name: "Amy Lee"
                                }
                            ],
                            labels: ["feature", "security"],
                            draft: false,
                            merge_status: "checking",
                            has_conflicts: false,
                            created_at: "2024-01-20T10:00:00.000Z",
                            updated_at: "2024-01-20T10:00:00.000Z",
                            merged_at: null,
                            web_url:
                                "https://gitlab.com/acme-corp/backend-api/-/merge_requests/157",
                            user_notes_count: 0
                        },
                        {
                            id: 87654323,
                            iid: 158,
                            title: "Draft: Refactor database connection pooling",
                            description: "WIP refactoring",
                            state: "opened",
                            source_branch: "wip/refactor-database-layer",
                            target_branch: "main",
                            author: {
                                id: 1001,
                                username: "jdeveloper",
                                name: "Jane Developer"
                            },
                            assignees: [],
                            reviewers: [],
                            labels: ["refactor"],
                            draft: true,
                            merge_status: "can_be_merged",
                            has_conflicts: false,
                            created_at: "2024-01-20T11:00:00.000Z",
                            updated_at: "2024-01-20T11:00:00.000Z",
                            merged_at: null,
                            web_url:
                                "https://gitlab.com/acme-corp/backend-api/-/merge_requests/158",
                            user_notes_count: 0
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    project_id: "nonexistent%2Fproject"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Project Not Found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "mergeMergeRequest",
        provider: "gitlab",
        validCases: [
            {
                name: "basic_merge",
                description: "Merge a merge request",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 156
                },
                expectedOutput: {
                    id: 87654321,
                    iid: 156,
                    title: "Add user authentication module",
                    state: "merged",
                    merged: true,
                    merge_commit_sha: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3",
                    squash_commit_sha: null,
                    merged_at: "2024-01-22T10:00:00.000Z",
                    merged_by: {
                        id: 1001,
                        username: "jdeveloper",
                        name: "Jane Developer"
                    },
                    source_branch: "feature/add-user-authentication",
                    target_branch: "main",
                    web_url: "https://gitlab.com/acme-corp/backend-api/-/merge_requests/156"
                }
            }
        ],
        errorCases: [
            {
                name: "merge_request_not_found",
                description: "Merge request does not exist",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Merge Request Not Found",
                    retryable: false
                }
            },
            {
                name: "cannot_be_merged",
                description: "Merge request has conflicts",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 160
                },
                expectedError: {
                    type: "validation",
                    message: "Merge request cannot be merged: merge conflicts detected",
                    retryable: false
                }
            },
            {
                name: "pipeline_not_succeeded",
                description: "Pipeline must succeed before merging",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 161
                },
                expectedError: {
                    type: "validation",
                    message: "Pipeline must succeed before merging",
                    retryable: true
                }
            },
            {
                name: "sha_mismatch",
                description: "SHA does not match current HEAD",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 156,
                    sha: "outdated_sha_1234567890abcdef"
                },
                expectedError: {
                    type: "validation",
                    message: "SHA does not match HEAD of source branch",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    merge_request_iid: 156
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================
    // PIPELINE OPERATIONS
    // ============================================================
    {
        operationId: "listPipelines",
        provider: "gitlab",
        validCases: [
            {
                name: "list_all_pipelines",
                description: "List all pipelines in a project",
                input: {
                    project_id: "12345678"
                },
                expectedOutput: {
                    pipelines: [
                        {
                            id: 456789012,
                            iid: 1542,
                            project_id: 12345678,
                            status: "success",
                            source: "push",
                            ref: "main",
                            sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
                            web_url:
                                "https://gitlab.com/acme-corp/backend-api/-/pipelines/456789012",
                            created_at: "2024-01-22T10:15:00.000Z",
                            updated_at: "2024-01-22T10:25:00.000Z",
                            started_at: "2024-01-22T10:15:30.000Z",
                            finished_at: "2024-01-22T10:25:00.000Z",
                            duration: 570,
                            coverage: "87.5"
                        },
                        {
                            id: 456789011,
                            iid: 1541,
                            project_id: 12345678,
                            status: "failed",
                            source: "merge_request_event",
                            ref: "feature/oauth2-integration",
                            sha: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1",
                            web_url:
                                "https://gitlab.com/acme-corp/backend-api/-/pipelines/456789011",
                            created_at: "2024-01-22T09:00:00.000Z",
                            updated_at: "2024-01-22T09:12:00.000Z",
                            started_at: "2024-01-22T09:00:30.000Z",
                            finished_at: "2024-01-22T09:12:00.000Z",
                            duration: 690,
                            coverage: null
                        },
                        {
                            id: 456789010,
                            iid: 1540,
                            project_id: 12345678,
                            status: "running",
                            source: "push",
                            ref: "develop",
                            sha: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2",
                            web_url:
                                "https://gitlab.com/acme-corp/backend-api/-/pipelines/456789010",
                            created_at: "2024-01-22T10:30:00.000Z",
                            updated_at: "2024-01-22T10:35:00.000Z",
                            started_at: "2024-01-22T10:30:30.000Z",
                            finished_at: null,
                            duration: null,
                            coverage: null
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    project_id: "nonexistent%2Fproject"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Project Not Found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "triggerPipeline",
        provider: "gitlab",
        validCases: [
            {
                name: "trigger_pipeline_on_main",
                description: "Trigger a pipeline on the main branch",
                input: {
                    project_id: "12345678",
                    ref: "main"
                },
                expectedOutput: {
                    id: 456789015,
                    iid: 1545,
                    project_id: 12345678,
                    status: "created",
                    source: "api",
                    ref: "main",
                    sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
                    web_url: "https://gitlab.com/acme-corp/backend-api/-/pipelines/456789015",
                    created_at: "2024-01-22T15:00:00.000Z",
                    user: {
                        id: 1001,
                        username: "jdeveloper",
                        name: "Jane Developer"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "ref_not_found",
                description: "Branch or tag does not exist",
                input: {
                    project_id: "12345678",
                    ref: "nonexistent-branch"
                },
                expectedError: {
                    type: "validation",
                    message: "Reference not found",
                    retryable: false
                }
            },
            {
                name: "no_ci_config",
                description: "Project has no .gitlab-ci.yml",
                input: {
                    project_id: "12345678",
                    ref: "main"
                },
                expectedError: {
                    type: "validation",
                    message: "No CI/CD configuration found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    ref: "main"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },

    // ============================================================
    // PROJECT OPERATIONS
    // ============================================================
    {
        operationId: "createProject",
        provider: "gitlab",
        validCases: [
            {
                name: "basic_project",
                description: "Create a basic private project",
                input: {
                    name: "new-microservice",
                    description: "A new microservice for handling payments",
                    visibility: "private"
                },
                expectedOutput: {
                    id: 23456789,
                    name: "new-microservice",
                    path: "new-microservice",
                    path_with_namespace: "jdeveloper/new-microservice",
                    description: "A new microservice for handling payments",
                    visibility: "private",
                    web_url: "https://gitlab.com/jdeveloper/new-microservice",
                    http_url_to_repo: "https://gitlab.com/jdeveloper/new-microservice.git",
                    ssh_url_to_repo: "git@gitlab.com:jdeveloper/new-microservice.git",
                    default_branch: "main",
                    created_at: "2024-01-22T16:00:00.000Z"
                }
            }
        ],
        errorCases: [
            {
                name: "duplicate_project",
                description: "Project with this path already exists",
                input: {
                    name: "existing-project",
                    path: "existing-project"
                },
                expectedError: {
                    type: "validation",
                    message: "Path has already been taken",
                    retryable: false
                }
            },
            {
                name: "invalid_namespace",
                description: "Namespace does not exist or not accessible",
                input: {
                    name: "new-project",
                    namespace_id: 99999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Namespace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    name: "test-project"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteProject",
        provider: "gitlab",
        validCases: [
            {
                name: "delete_by_id",
                description: "Delete a project by numeric ID",
                input: {
                    project_id: "23456789"
                },
                expectedOutput: {
                    deleted: true,
                    project_id: "23456789"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    project_id: "nonexistent%2Fproject"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Project Not Found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No Owner permission to delete project",
                input: {
                    project_id: "other-org%2Ftheir-project"
                },
                expectedError: {
                    type: "permission",
                    message: "403 Forbidden - Owner permission required",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getProject",
        provider: "gitlab",
        validCases: [
            {
                name: "get_by_id",
                description: "Get project details by numeric ID",
                input: {
                    project_id: "12345678"
                },
                expectedOutput: {
                    id: 12345678,
                    name: "Backend API",
                    path: "backend-api",
                    path_with_namespace: "acme-corp/backend-api",
                    name_with_namespace: "Acme Corp / Backend API",
                    description:
                        "Core backend API service handling authentication, data processing, and integrations",
                    visibility: "private",
                    web_url: "https://gitlab.com/acme-corp/backend-api",
                    http_url_to_repo: "https://gitlab.com/acme-corp/backend-api.git",
                    ssh_url_to_repo: "git@gitlab.com:acme-corp/backend-api.git",
                    default_branch: "main",
                    created_at: "2023-06-15T08:00:00.000Z",
                    last_activity_at: "2024-01-22T10:25:00.000Z",
                    star_count: 15,
                    forks_count: 3,
                    open_issues_count: 12,
                    archived: false,
                    issues_enabled: true,
                    merge_requests_enabled: true,
                    wiki_enabled: true,
                    jobs_enabled: true,
                    namespace: {
                        id: 9876543,
                        name: "Acme Corp",
                        path: "acme-corp",
                        kind: "group",
                        full_path: "acme-corp"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    project_id: "nonexistent%2Fproject"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Project Not Found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listProjects",
        provider: "gitlab",
        validCases: [
            {
                name: "list_member_projects",
                description: "List projects user is a member of",
                input: {
                    membership: true
                },
                expectedOutput: {
                    projects: [
                        {
                            id: 12345678,
                            name: "Backend API",
                            path: "backend-api",
                            path_with_namespace: "acme-corp/backend-api",
                            description: "Core backend API service",
                            visibility: "private",
                            web_url: "https://gitlab.com/acme-corp/backend-api",
                            default_branch: "main",
                            created_at: "2023-06-15T08:00:00.000Z",
                            last_activity_at: "2024-01-22T10:25:00.000Z",
                            star_count: 15,
                            forks_count: 3,
                            open_issues_count: 12,
                            archived: false
                        },
                        {
                            id: 23456790,
                            name: "Frontend App",
                            path: "frontend-app",
                            path_with_namespace: "acme-corp/frontend-app",
                            description: "React frontend application",
                            visibility: "internal",
                            web_url: "https://gitlab.com/acme-corp/frontend-app",
                            default_branch: "main",
                            created_at: "2023-08-01T10:00:00.000Z",
                            last_activity_at: "2024-01-21T16:00:00.000Z",
                            star_count: 8,
                            forks_count: 1,
                            open_issues_count: 5,
                            archived: false
                        },
                        {
                            id: 34567890,
                            name: "Infrastructure",
                            path: "infrastructure",
                            path_with_namespace: "acme-corp/infrastructure",
                            description: "Terraform and Kubernetes configurations",
                            visibility: "private",
                            web_url: "https://gitlab.com/acme-corp/infrastructure",
                            default_branch: "main",
                            created_at: "2023-04-20T12:00:00.000Z",
                            last_activity_at: "2024-01-20T09:00:00.000Z",
                            star_count: 5,
                            forks_count: 0,
                            open_issues_count: 3,
                            archived: false
                        }
                    ],
                    count: 3
                }
            }
        ],
        errorCases: [
            {
                name: "invalid_visibility",
                description: "Invalid visibility filter",
                input: {
                    visibility: "invalid" as unknown as "private"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid visibility value",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    membership: true
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateProject",
        provider: "gitlab",
        validCases: [
            {
                name: "update_description",
                description: "Update project description",
                input: {
                    project_id: "12345678",
                    description:
                        "Core backend API service - handles authentication, data processing, integrations, and real-time notifications"
                },
                expectedOutput: {
                    id: 12345678,
                    name: "Backend API",
                    path: "backend-api",
                    path_with_namespace: "acme-corp/backend-api",
                    description:
                        "Core backend API service - handles authentication, data processing, integrations, and real-time notifications",
                    visibility: "private",
                    web_url: "https://gitlab.com/acme-corp/backend-api",
                    default_branch: "main",
                    archived: false,
                    issues_enabled: true,
                    merge_requests_enabled: true,
                    wiki_enabled: true,
                    jobs_enabled: true
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project does not exist",
                input: {
                    project_id: "nonexistent%2Fproject",
                    description: "Updated description"
                },
                expectedError: {
                    type: "not_found",
                    message: "404 Project Not Found",
                    retryable: false
                }
            },
            {
                name: "permission",
                description: "No permission to update project",
                input: {
                    project_id: "other-org%2Ftheir-project",
                    description: "Updated description"
                },
                expectedError: {
                    type: "permission",
                    message: "403 Forbidden",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "API rate limit exceeded",
                input: {
                    project_id: "12345678",
                    description: "Updated"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "429 Too Many Requests",
                    retryable: true
                }
            }
        ]
    }
];
