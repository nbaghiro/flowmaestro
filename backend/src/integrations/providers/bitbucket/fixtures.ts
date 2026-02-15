/**
 * Bitbucket Provider Test Fixtures
 *
 * Based on Bitbucket REST API 2.0 response structures.
 * Provides comprehensive test data for repositories, pull requests, issues, and pipelines.
 */

import type { TestFixture } from "../../sandbox";

// Sample pull requests for filterable tests
const samplePullRequests = [
    {
        id: 42,
        title: "feat: Add user authentication with OAuth2",
        description:
            "Implements OAuth2 authentication flow including:\n- Login/logout endpoints\n- Token refresh\n- Session management",
        state: "OPEN",
        source_branch: "feature/oauth2-auth",
        destination_branch: "main",
        author: {
            uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
            display_name: "Alice Chen",
            username: "alicechen"
        },
        created_on: "2024-01-15T09:30:00.000000+00:00",
        updated_on: "2024-01-18T14:22:00.000000+00:00",
        close_source_branch: true,
        comment_count: 8,
        task_count: 2,
        reviewers: [
            {
                uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
                display_name: "Bob Martinez"
            }
        ],
        html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/42",
        _state: "OPEN"
    },
    {
        id: 41,
        title: "fix: Resolve database connection pool exhaustion",
        description:
            "Fixes critical bug where connection pool was being exhausted under load.\n\nRoot cause: Connections not being released after transaction errors.",
        state: "MERGED",
        source_branch: "bugfix/connection-pool",
        destination_branch: "main",
        author: {
            uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
            display_name: "Bob Martinez",
            username: "bobmartinez"
        },
        created_on: "2024-01-10T11:00:00.000000+00:00",
        updated_on: "2024-01-12T16:45:00.000000+00:00",
        close_source_branch: true,
        comment_count: 12,
        task_count: 0,
        reviewers: [
            {
                uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
                display_name: "Alice Chen"
            },
            {
                uuid: "{c3d4e5f6-a7b8-9012-cdef-345678901234}",
                display_name: "Carol Williams"
            }
        ],
        html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/41",
        _state: "MERGED"
    },
    {
        id: 40,
        title: "chore: Update dependencies to latest versions",
        description:
            "Updates all npm dependencies to their latest compatible versions.\n\nNotable changes:\n- express 4.18.2 -> 4.19.0\n- typescript 5.2.0 -> 5.3.3",
        state: "DECLINED",
        source_branch: "chore/update-deps",
        destination_branch: "main",
        author: {
            uuid: "{c3d4e5f6-a7b8-9012-cdef-345678901234}",
            display_name: "Carol Williams",
            username: "carolw"
        },
        created_on: "2024-01-08T08:15:00.000000+00:00",
        updated_on: "2024-01-09T10:30:00.000000+00:00",
        close_source_branch: false,
        comment_count: 3,
        task_count: 1,
        reviewers: [],
        html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/40",
        _state: "DECLINED"
    },
    {
        id: 39,
        title: "feat: Implement rate limiting middleware",
        description:
            "Adds configurable rate limiting for API endpoints using sliding window algorithm.",
        state: "OPEN",
        source_branch: "feature/rate-limiting",
        destination_branch: "develop",
        author: {
            uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
            display_name: "Alice Chen",
            username: "alicechen"
        },
        created_on: "2024-01-17T13:45:00.000000+00:00",
        updated_on: "2024-01-17T13:45:00.000000+00:00",
        close_source_branch: true,
        comment_count: 0,
        task_count: 0,
        reviewers: [
            {
                uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
                display_name: "Bob Martinez"
            }
        ],
        html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/39",
        _state: "OPEN"
    }
];

// Sample repositories for filterable tests
const sampleRepositories = [
    {
        uuid: "{repo-1111-2222-3333-444455556666}",
        name: "backend-api",
        full_name: "acme-corp/backend-api",
        description: "Core REST API service for the ACME platform",
        is_private: true,
        language: "typescript",
        created_on: "2023-06-15T10:00:00.000000+00:00",
        updated_on: "2024-01-20T08:30:00.000000+00:00",
        size: 45678912,
        has_issues: true,
        has_wiki: true,
        mainbranch: "main",
        scm: "git",
        html_url: "https://bitbucket.org/acme-corp/backend-api",
        workspace: {
            slug: "acme-corp",
            name: "ACME Corporation"
        },
        _language: "typescript"
    },
    {
        uuid: "{repo-2222-3333-4444-555566667777}",
        name: "frontend-app",
        full_name: "acme-corp/frontend-app",
        description: "React-based web application frontend",
        is_private: true,
        language: "javascript",
        created_on: "2023-06-20T14:30:00.000000+00:00",
        updated_on: "2024-01-19T16:15:00.000000+00:00",
        size: 32456789,
        has_issues: true,
        has_wiki: false,
        mainbranch: "main",
        scm: "git",
        html_url: "https://bitbucket.org/acme-corp/frontend-app",
        workspace: {
            slug: "acme-corp",
            name: "ACME Corporation"
        },
        _language: "javascript"
    },
    {
        uuid: "{repo-3333-4444-5555-666677778888}",
        name: "infrastructure",
        full_name: "acme-corp/infrastructure",
        description: "Terraform and Kubernetes configurations for ACME infrastructure",
        is_private: true,
        language: "hcl",
        created_on: "2023-05-01T09:00:00.000000+00:00",
        updated_on: "2024-01-15T11:20:00.000000+00:00",
        size: 8765432,
        has_issues: false,
        has_wiki: true,
        mainbranch: "main",
        scm: "git",
        html_url: "https://bitbucket.org/acme-corp/infrastructure",
        workspace: {
            slug: "acme-corp",
            name: "ACME Corporation"
        },
        _language: "hcl"
    },
    {
        uuid: "{repo-4444-5555-6666-777788889999}",
        name: "mobile-app",
        full_name: "acme-corp/mobile-app",
        description: "React Native mobile application for iOS and Android",
        is_private: false,
        language: "typescript",
        created_on: "2023-09-01T08:00:00.000000+00:00",
        updated_on: "2024-01-18T09:45:00.000000+00:00",
        size: 28934567,
        has_issues: true,
        has_wiki: true,
        mainbranch: "develop",
        scm: "git",
        html_url: "https://bitbucket.org/acme-corp/mobile-app",
        workspace: {
            slug: "acme-corp",
            name: "ACME Corporation"
        },
        _language: "typescript"
    }
];

// Sample issues for filterable tests
const sampleIssues = [
    {
        id: 156,
        title: "API returns 500 error on malformed JSON input",
        content:
            "When sending malformed JSON to POST /api/v1/users, the server returns a 500 error instead of 400 Bad Request.",
        state: "new",
        kind: "bug",
        priority: "critical",
        reporter: {
            uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
            display_name: "Alice Chen"
        },
        assignee: {
            uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
            display_name: "Bob Martinez"
        },
        component: "api",
        milestone: "v2.1.0",
        version: "2.0.5",
        created_on: "2024-01-18T10:30:00.000000+00:00",
        updated_on: "2024-01-18T15:45:00.000000+00:00",
        votes: 5,
        html_url: "https://bitbucket.org/acme-corp/backend-api/issues/156",
        _state: "new",
        _kind: "bug",
        _priority: "critical"
    },
    {
        id: 155,
        title: "Add support for bulk user import",
        content:
            "Feature request: Allow administrators to import users from CSV files.\n\nAcceptance criteria:\n- Support CSV and JSON formats\n- Validate data before import\n- Provide detailed error report",
        state: "open",
        kind: "enhancement",
        priority: "major",
        reporter: {
            uuid: "{c3d4e5f6-a7b8-9012-cdef-345678901234}",
            display_name: "Carol Williams"
        },
        assignee: null,
        component: "admin",
        milestone: "v2.2.0",
        version: null,
        created_on: "2024-01-15T14:00:00.000000+00:00",
        updated_on: "2024-01-16T09:20:00.000000+00:00",
        votes: 12,
        html_url: "https://bitbucket.org/acme-corp/backend-api/issues/155",
        _state: "open",
        _kind: "enhancement",
        _priority: "major"
    },
    {
        id: 154,
        title: "Implement audit logging for sensitive operations",
        content: "We need comprehensive audit logging for compliance requirements.",
        state: "resolved",
        kind: "task",
        priority: "major",
        reporter: {
            uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
            display_name: "Alice Chen"
        },
        assignee: {
            uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
            display_name: "Alice Chen"
        },
        component: "security",
        milestone: "v2.0.0",
        version: "2.0.0",
        created_on: "2023-12-01T08:00:00.000000+00:00",
        updated_on: "2024-01-10T11:30:00.000000+00:00",
        votes: 8,
        html_url: "https://bitbucket.org/acme-corp/backend-api/issues/154",
        _state: "resolved",
        _kind: "task",
        _priority: "major"
    },
    {
        id: 153,
        title: "Consider migrating to GraphQL",
        content: "Proposal to evaluate GraphQL as an alternative to REST for our API.",
        state: "on hold",
        kind: "proposal",
        priority: "minor",
        reporter: {
            uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
            display_name: "Bob Martinez"
        },
        assignee: null,
        component: "api",
        milestone: null,
        version: null,
        created_on: "2023-11-20T16:30:00.000000+00:00",
        updated_on: "2024-01-05T10:00:00.000000+00:00",
        votes: 3,
        html_url: "https://bitbucket.org/acme-corp/backend-api/issues/153",
        _state: "on hold",
        _kind: "proposal",
        _priority: "minor"
    }
];

// Sample pipelines for filterable tests
const samplePipelines = [
    {
        uuid: "{pipe-1111-2222-3333-444455556666}",
        build_number: 245,
        state: {
            name: "COMPLETED",
            result: "SUCCESSFUL"
        },
        target: {
            type: "pipeline_ref_target",
            ref_type: "branch",
            ref_name: "main",
            commit: "a1b2c3d4e5f6789012345678901234567890abcd"
        },
        trigger: {
            type: "push",
            name: "Push to main"
        },
        creator: {
            uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
            display_name: "Alice Chen"
        },
        created_on: "2024-01-20T08:00:00.000000+00:00",
        completed_on: "2024-01-20T08:12:34.000000+00:00",
        duration_in_seconds: 754,
        build_seconds_used: 512,
        html_url: "https://bitbucket.org/acme-corp/backend-api/pipelines/results/245",
        _state: "COMPLETED"
    },
    {
        uuid: "{pipe-2222-3333-4444-555566667777}",
        build_number: 244,
        state: {
            name: "COMPLETED",
            result: "FAILED"
        },
        target: {
            type: "pipeline_ref_target",
            ref_type: "branch",
            ref_name: "feature/oauth2-auth",
            commit: "b2c3d4e5f6a789012345678901234567890bcde"
        },
        trigger: {
            type: "push",
            name: "Push to feature/oauth2-auth"
        },
        creator: {
            uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
            display_name: "Alice Chen"
        },
        created_on: "2024-01-19T16:30:00.000000+00:00",
        completed_on: "2024-01-19T16:38:12.000000+00:00",
        duration_in_seconds: 492,
        build_seconds_used: 312,
        html_url: "https://bitbucket.org/acme-corp/backend-api/pipelines/results/244",
        _state: "COMPLETED"
    },
    {
        uuid: "{pipe-3333-4444-5555-666677778888}",
        build_number: 243,
        state: {
            name: "IN_PROGRESS",
            result: null
        },
        target: {
            type: "pipeline_ref_target",
            ref_type: "branch",
            ref_name: "develop",
            commit: "c3d4e5f6a7b89012345678901234567890cdef"
        },
        trigger: {
            type: "manual",
            name: "Manual trigger"
        },
        creator: {
            uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
            display_name: "Bob Martinez"
        },
        created_on: "2024-01-20T09:45:00.000000+00:00",
        completed_on: null,
        duration_in_seconds: null,
        build_seconds_used: 180,
        html_url: "https://bitbucket.org/acme-corp/backend-api/pipelines/results/243",
        _state: "IN_PROGRESS"
    },
    {
        uuid: "{pipe-4444-5555-6666-777788889999}",
        build_number: 242,
        state: {
            name: "COMPLETED",
            result: "SUCCESSFUL"
        },
        target: {
            type: "pipeline_ref_target",
            ref_type: "tag",
            ref_name: "v2.0.5",
            commit: "d4e5f6a7b8c9012345678901234567890defg"
        },
        trigger: {
            type: "push",
            name: "Tag v2.0.5"
        },
        creator: {
            uuid: "{c3d4e5f6-a7b8-9012-cdef-345678901234}",
            display_name: "Carol Williams"
        },
        created_on: "2024-01-18T14:00:00.000000+00:00",
        completed_on: "2024-01-18T14:18:45.000000+00:00",
        duration_in_seconds: 1125,
        build_seconds_used: 890,
        html_url: "https://bitbucket.org/acme-corp/backend-api/pipelines/results/242",
        _state: "COMPLETED"
    }
];

export const bitbucketFixtures: TestFixture[] = [
    // ========== ISSUE OPERATIONS ==========
    {
        operationId: "createIssue",
        provider: "bitbucket",
        validCases: [
            {
                name: "create_bug_report",
                description: "Create a bug report with full details",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "API returns 500 error on malformed JSON input",
                    content:
                        "When sending malformed JSON to POST /api/v1/users, the server returns a 500 error instead of 400 Bad Request.\n\n**Steps to reproduce:**\n1. Send POST request with invalid JSON\n2. Observe 500 error instead of 400",
                    kind: "bug",
                    priority: "critical",
                    assignee_uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
                    component: "api",
                    milestone: "v2.1.0"
                },
                expectedOutput: {
                    id: 157,
                    title: "API returns 500 error on malformed JSON input",
                    content:
                        "When sending malformed JSON to POST /api/v1/users, the server returns a 500 error instead of 400 Bad Request.\n\n**Steps to reproduce:**\n1. Send POST request with invalid JSON\n2. Observe 500 error instead of 400",
                    state: "new",
                    kind: "bug",
                    priority: "critical",
                    reporter: {
                        uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
                        display_name: "Alice Chen"
                    },
                    created_on: "2024-01-20T10:00:00.000000+00:00",
                    html_url: "https://bitbucket.org/acme-corp/backend-api/issues/157"
                }
            }
        ],
        errorCases: [
            {
                name: "repository_not_found",
                description: "Create issue in non-existent repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "nonexistent-repo",
                    title: "Test issue",
                    kind: "bug"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Issue tracker is not enabled for this repository. Enable it in repository settings.",
                    retryable: false
                }
            },
            {
                name: "issue_tracker_disabled",
                description: "Create issue when issue tracker is disabled",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "infrastructure",
                    title: "Test issue",
                    kind: "bug"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Issue tracker is not enabled for this repository. Enable it in repository settings.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while creating issue",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "Test issue",
                    kind: "bug"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listIssues",
        provider: "bitbucket",
        validCases: [
            {
                name: "list_all_issues",
                description: "List all issues in a repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                }
            }
        ],
        errorCases: [
            {
                name: "repository_not_found",
                description: "List issues from non-existent repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "nonexistent-repo"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Issue tracker is not enabled for this repository. Enable it in repository settings.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while listing issues",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleIssues,
            recordsField: "issues",
            offsetField: "page",
            defaultPageSize: 20,
            maxPageSize: 50,
            pageSizeParam: "pagelen",
            offsetParam: "page",
            filterConfig: {
                type: "generic",
                filterableFields: ["_state", "_kind", "_priority"]
            }
        }
    },

    // ========== PIPELINE OPERATIONS ==========
    {
        operationId: "getPipeline",
        provider: "bitbucket",
        validCases: [
            {
                name: "get_successful_pipeline",
                description: "Get details of a successful pipeline run",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pipeline_uuid: "{pipe-1111-2222-3333-444455556666}"
                },
                expectedOutput: {
                    uuid: "{pipe-1111-2222-3333-444455556666}",
                    build_number: 245,
                    run_number: 245,
                    state: {
                        type: "pipeline_state_completed",
                        name: "COMPLETED",
                        result: {
                            type: "pipeline_state_completed_successful",
                            name: "SUCCESSFUL"
                        },
                        stage: null
                    },
                    target: {
                        type: "pipeline_ref_target",
                        ref_type: "branch",
                        ref_name: "main",
                        selector: null,
                        commit: "a1b2c3d4e5f6789012345678901234567890abcd"
                    },
                    trigger: {
                        type: "push",
                        name: "Push to main"
                    },
                    creator: {
                        uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
                        display_name: "Alice Chen",
                        username: "alicechen"
                    },
                    created_on: "2024-01-20T08:00:00.000000+00:00",
                    completed_on: "2024-01-20T08:12:34.000000+00:00",
                    duration_in_seconds: 754,
                    build_seconds_used: 512,
                    first_successful: false,
                    expired: false,
                    html_url: "https://bitbucket.org/acme-corp/backend-api/pipelines/results/245"
                }
            }
        ],
        errorCases: [
            {
                name: "pipeline_not_found",
                description: "Pipeline does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pipeline_uuid: "{nonexistent-pipeline-uuid}"
                },
                expectedError: {
                    type: "not_found",
                    message: "Pipeline not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while getting pipeline",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pipeline_uuid: "{pipe-1111-2222-3333-444455556666}"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listPipelines",
        provider: "bitbucket",
        validCases: [
            {
                name: "list_all_pipelines",
                description: "List all pipelines in a repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                }
            }
        ],
        errorCases: [
            {
                name: "pipelines_not_enabled",
                description: "Pipelines are not enabled for this repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "old-legacy-repo"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Pipelines are not enabled for this repository. Enable them in repository settings.",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while listing pipelines",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: samplePipelines,
            recordsField: "pipelines",
            offsetField: "page",
            defaultPageSize: 20,
            maxPageSize: 50,
            pageSizeParam: "pagelen",
            offsetParam: "page",
            filterConfig: {
                type: "generic",
                filterableFields: ["_state"]
            }
        }
    },
    {
        operationId: "triggerPipeline",
        provider: "bitbucket",
        validCases: [
            {
                name: "trigger_branch_pipeline",
                description: "Trigger pipeline on a branch",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    target_type: "branch",
                    target_ref: "main"
                },
                expectedOutput: {
                    uuid: "{new-pipe-1234-5678-90ab-cdef12345678}",
                    build_number: 246,
                    state: {
                        name: "PENDING",
                        result: null
                    },
                    target: {
                        type: "pipeline_ref_target",
                        ref_type: "branch",
                        ref_name: "main"
                    },
                    trigger: {
                        type: "manual",
                        name: "Manual trigger"
                    },
                    creator: {
                        uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
                        display_name: "Alice Chen"
                    },
                    created_on: "2024-01-20T11:00:00.000000+00:00",
                    html_url: "https://bitbucket.org/acme-corp/backend-api/pipelines/results/246"
                }
            }
        ],
        errorCases: [
            {
                name: "pipelines_not_enabled",
                description: "Pipelines are not enabled for this repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "old-legacy-repo",
                    target_type: "branch",
                    target_ref: "main"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Pipelines are not enabled for this repository. Enable them in repository settings.",
                    retryable: false
                }
            },
            {
                name: "branch_not_found",
                description: "Target branch does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    target_type: "branch",
                    target_ref: "nonexistent-branch"
                },
                expectedError: {
                    type: "not_found",
                    message: "Branch 'nonexistent-branch' not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while triggering pipeline",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    target_type: "branch",
                    target_ref: "main"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========== PULL REQUEST OPERATIONS ==========
    {
        operationId: "createPullRequest",
        provider: "bitbucket",
        validCases: [
            {
                name: "create_feature_pr",
                description: "Create a pull request for a feature branch",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "feat: Add user authentication with OAuth2",
                    source_branch: "feature/oauth2-auth",
                    destination_branch: "main",
                    description:
                        "Implements OAuth2 authentication flow including:\n- Login/logout endpoints\n- Token refresh\n- Session management\n\n## Test Plan\n- [ ] Unit tests pass\n- [ ] Integration tests pass\n- [ ] Manual QA completed",
                    close_source_branch: true,
                    reviewers: ["{b2c3d4e5-f6a7-8901-bcde-f23456789012}"]
                },
                expectedOutput: {
                    id: 43,
                    title: "feat: Add user authentication with OAuth2",
                    description:
                        "Implements OAuth2 authentication flow including:\n- Login/logout endpoints\n- Token refresh\n- Session management\n\n## Test Plan\n- [ ] Unit tests pass\n- [ ] Integration tests pass\n- [ ] Manual QA completed",
                    state: "OPEN",
                    source_branch: "feature/oauth2-auth",
                    destination_branch: "main",
                    author: {
                        uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
                        display_name: "Alice Chen"
                    },
                    created_on: "2024-01-20T12:00:00.000000+00:00",
                    html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/43"
                }
            }
        ],
        errorCases: [
            {
                name: "branch_not_found",
                description: "Source branch does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "Test PR",
                    source_branch: "nonexistent-branch",
                    destination_branch: "main"
                },
                expectedError: {
                    type: "not_found",
                    message: "Source branch 'nonexistent-branch' not found",
                    retryable: false
                }
            },
            {
                name: "no_changes",
                description: "Source and destination branches have no differences",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "Test PR",
                    source_branch: "main",
                    destination_branch: "main"
                },
                expectedError: {
                    type: "validation",
                    message: "There are no changes between the source and destination branches",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while creating pull request",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "Test PR",
                    source_branch: "feature/test",
                    destination_branch: "main"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPullRequest",
        provider: "bitbucket",
        validCases: [
            {
                name: "get_open_pr",
                description: "Get details of an open pull request",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42
                },
                expectedOutput: {
                    id: 42,
                    title: "feat: Add user authentication with OAuth2",
                    description:
                        "Implements OAuth2 authentication flow including:\n- Login/logout endpoints\n- Token refresh\n- Session management",
                    state: "OPEN",
                    source: {
                        branch: "feature/oauth2-auth",
                        commit: "f6a7890123456789012345678901234567890123"
                    },
                    destination: {
                        branch: "main",
                        commit: "a1b2c3d4e5f6789012345678901234567890abcd"
                    },
                    author: {
                        uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
                        display_name: "Alice Chen",
                        username: "alicechen"
                    },
                    created_on: "2024-01-15T09:30:00.000000+00:00",
                    updated_on: "2024-01-18T14:22:00.000000+00:00",
                    close_source_branch: true,
                    merge_commit: null,
                    closed_by: null,
                    comment_count: 8,
                    task_count: 2,
                    reviewers: [
                        {
                            uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
                            display_name: "Bob Martinez",
                            username: "bobmartinez"
                        }
                    ],
                    participants: [
                        {
                            user: {
                                uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
                                display_name: "Bob Martinez"
                            },
                            role: "REVIEWER",
                            approved: true,
                            state: "approved"
                        }
                    ],
                    html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/42"
                }
            }
        ],
        errorCases: [
            {
                name: "pr_not_found",
                description: "Pull request does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 99999
                },
                expectedError: {
                    type: "not_found",
                    message: "Pull request not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while getting pull request",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listPullRequests",
        provider: "bitbucket",
        validCases: [
            {
                name: "list_all_prs",
                description: "List all pull requests in a repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                }
            }
        ],
        errorCases: [
            {
                name: "repository_not_found",
                description: "Repository does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "nonexistent-repo"
                },
                expectedError: {
                    type: "not_found",
                    message: "Repository not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while listing pull requests",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: samplePullRequests,
            recordsField: "pull_requests",
            offsetField: "page",
            defaultPageSize: 20,
            maxPageSize: 50,
            pageSizeParam: "pagelen",
            offsetParam: "page",
            filterConfig: {
                type: "generic",
                filterableFields: ["_state"]
            }
        }
    },
    {
        operationId: "mergePullRequest",
        provider: "bitbucket",
        validCases: [
            {
                name: "merge_with_commit",
                description: "Merge pull request with merge commit strategy",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42,
                    merge_strategy: "merge_commit",
                    message: "Merge pull request #42: feat: Add user authentication with OAuth2",
                    close_source_branch: true
                },
                expectedOutput: {
                    id: 42,
                    title: "feat: Add user authentication with OAuth2",
                    state: "MERGED",
                    merged: true,
                    merge_commit: "e5f6a7b8c9d0123456789012345678901234abcd",
                    source_branch: "feature/oauth2-auth",
                    destination_branch: "main",
                    closed_by: {
                        uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
                        display_name: "Alice Chen"
                    },
                    html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/42"
                }
            }
        ],
        errorCases: [
            {
                name: "merge_conflict",
                description: "Pull request has merge conflicts",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 46,
                    merge_strategy: "merge_commit"
                },
                expectedError: {
                    type: "validation",
                    message: "Pull request has merge conflicts that must be resolved",
                    retryable: false
                }
            },
            {
                name: "pr_already_merged",
                description: "Pull request is already merged",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 41,
                    merge_strategy: "merge_commit"
                },
                expectedError: {
                    type: "validation",
                    message: "Pull request is already merged",
                    retryable: false
                }
            },
            {
                name: "pr_declined",
                description: "Cannot merge a declined pull request",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 40,
                    merge_strategy: "merge_commit"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot merge a declined pull request",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while merging pull request",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42,
                    merge_strategy: "merge_commit"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updatePullRequest",
        provider: "bitbucket",
        validCases: [
            {
                name: "update_title",
                description: "Update pull request title",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42,
                    title: "feat: Add OAuth2 authentication with social login support"
                },
                expectedOutput: {
                    id: 42,
                    title: "feat: Add OAuth2 authentication with social login support",
                    description:
                        "Implements OAuth2 authentication flow including:\n- Login/logout endpoints\n- Token refresh\n- Session management",
                    state: "OPEN",
                    source_branch: "feature/oauth2-auth",
                    destination_branch: "main",
                    updated_on: "2024-01-20T13:00:00.000000+00:00",
                    html_url: "https://bitbucket.org/acme-corp/backend-api/pull-requests/42"
                }
            }
        ],
        errorCases: [
            {
                name: "pr_not_found",
                description: "Pull request does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 99999,
                    title: "Updated title"
                },
                expectedError: {
                    type: "not_found",
                    message: "Pull request not found",
                    retryable: false
                }
            },
            {
                name: "pr_closed",
                description: "Cannot update a closed pull request",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 41,
                    title: "Updated title"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot update a merged or declined pull request",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while updating pull request",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42,
                    title: "Updated title"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },

    // ========== REPOSITORY OPERATIONS ==========
    {
        operationId: "createRepository",
        provider: "bitbucket",
        validCases: [
            {
                name: "create_private_repo",
                description: "Create a private repository with all features",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "new-microservice",
                    name: "New Microservice",
                    description: "A new microservice for handling payments",
                    is_private: true,
                    has_issues: true,
                    has_wiki: true,
                    fork_policy: "no_public_forks",
                    project_key: "PAYMENTS",
                    language: "typescript"
                },
                expectedOutput: {
                    uuid: "{new-repo-1234-5678-90ab-cdef12345678}",
                    name: "New Microservice",
                    full_name: "acme-corp/new-microservice",
                    description: "A new microservice for handling payments",
                    is_private: true,
                    created_on: "2024-01-20T14:00:00.000000+00:00",
                    html_url: "https://bitbucket.org/acme-corp/new-microservice",
                    workspace: {
                        slug: "acme-corp",
                        name: "ACME Corporation"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "repo_already_exists",
                description: "Repository with the same name already exists",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Repository with slug 'backend-api' already exists in workspace 'acme-corp'",
                    retryable: false
                }
            },
            {
                name: "invalid_slug",
                description: "Repository slug contains invalid characters",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "Invalid Repo Name!"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Repository slug must contain only lowercase letters, numbers, and hyphens",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while creating repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "new-repo"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "deleteRepository",
        provider: "bitbucket",
        validCases: [
            {
                name: "delete_repository",
                description: "Delete an existing repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "old-deprecated-repo"
                },
                expectedOutput: {
                    deleted: true,
                    workspace: "acme-corp",
                    repo_slug: "old-deprecated-repo"
                }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                description: "Repository does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "nonexistent-repo"
                },
                expectedError: {
                    type: "not_found",
                    message: "Repository not found",
                    retryable: false
                }
            },
            {
                name: "insufficient_permissions",
                description: "User does not have admin permissions",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "protected-repo"
                },
                expectedError: {
                    type: "permission",
                    message: "You do not have permission to delete this repository",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while deleting repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "test-repo"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getRepository",
        provider: "bitbucket",
        validCases: [
            {
                name: "get_private_repo",
                description: "Get details of a private repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                },
                expectedOutput: {
                    uuid: "{repo-1111-2222-3333-444455556666}",
                    name: "backend-api",
                    full_name: "acme-corp/backend-api",
                    description: "Core REST API service for the ACME platform",
                    is_private: true,
                    fork_policy: "no_public_forks",
                    language: "typescript",
                    created_on: "2023-06-15T10:00:00.000000+00:00",
                    updated_on: "2024-01-20T08:30:00.000000+00:00",
                    size: 45678912,
                    has_issues: true,
                    has_wiki: true,
                    mainbranch: "main",
                    scm: "git",
                    html_url: "https://bitbucket.org/acme-corp/backend-api",
                    clone_url: "https://api.bitbucket.org/2.0/repositories/acme-corp/backend-api",
                    workspace: {
                        uuid: "{ws-1111-2222-3333-444455556666}",
                        slug: "acme-corp",
                        name: "ACME Corporation"
                    },
                    project: {
                        uuid: "{proj-1111-2222-3333-444455556666}",
                        key: "BACKEND",
                        name: "Backend Services"
                    },
                    owner: {
                        uuid: "{ws-1111-2222-3333-444455556666}",
                        display_name: "ACME Corporation"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                description: "Repository does not exist",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "nonexistent-repo"
                },
                expectedError: {
                    type: "not_found",
                    message: "Repository not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while getting repository",
                input: {
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "listRepositories",
        provider: "bitbucket",
        validCases: [
            {
                name: "list_all_repos",
                description: "List all repositories in a workspace",
                input: {
                    workspace: "acme-corp"
                }
            }
        ],
        errorCases: [
            {
                name: "workspace_not_found",
                description: "Workspace does not exist",
                input: {
                    workspace: "nonexistent-workspace"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workspace not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded while listing repositories",
                input: {
                    workspace: "acme-corp"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            }
        ],
        filterableData: {
            records: sampleRepositories,
            recordsField: "repositories",
            offsetField: "page",
            defaultPageSize: 20,
            maxPageSize: 100,
            pageSizeParam: "pagelen",
            offsetParam: "page",
            filterConfig: {
                type: "generic",
                filterableFields: ["_language"]
            }
        }
    }
];
