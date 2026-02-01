/**
 * GitHub Provider Test Fixtures
 *
 * Comprehensive fixtures for all GitHub REST API operations:
 * - Issues: https://docs.github.com/en/rest/issues
 * - Repositories: https://docs.github.com/en/rest/repos
 * - Pull Requests: https://docs.github.com/en/rest/pulls
 * - Workflows: https://docs.github.com/en/rest/actions/workflows
 */

import type { TestFixture } from "../../../sandbox";

// Common user object for reuse
const demoUser = {
    login: "demo-user",
    id: 12345678,
    node_id: "MDQ6VXNlcjEyMzQ1Njc4",
    avatar_url: "https://avatars.githubusercontent.com/u/12345678?v=4",
    type: "User",
    site_admin: false
};

const developer1 = {
    login: "developer1",
    id: 87654321,
    node_id: "MDQ6VXNlcjg3NjU0MzIx",
    avatar_url: "https://avatars.githubusercontent.com/u/87654321?v=4",
    type: "User",
    site_admin: false
};

// Sample repositories for filterableData
const sampleRepositories = [
    {
        id: 123456789,
        node_id: "R_kgDOGj1234567890",
        name: "demo-app",
        full_name: "demo-user/demo-app",
        private: false,
        owner: demoUser,
        html_url: "https://github.com/demo-user/demo-app",
        description: "A demo application",
        fork: false,
        language: "TypeScript",
        stargazers_count: 42,
        forks_count: 10,
        open_issues_count: 5,
        default_branch: "main",
        archived: false,
        created_at: "2023-01-15T10:00:00Z",
        updated_at: "2024-01-20T15:30:00Z"
    },
    {
        id: 123456790,
        node_id: "R_kgDOGj1234567891",
        name: "api-service",
        full_name: "demo-user/api-service",
        private: true,
        owner: demoUser,
        html_url: "https://github.com/demo-user/api-service",
        description: "Backend API service",
        fork: false,
        language: "Go",
        stargazers_count: 15,
        forks_count: 3,
        open_issues_count: 2,
        default_branch: "main",
        archived: false,
        created_at: "2023-06-01T08:00:00Z",
        updated_at: "2024-01-18T12:00:00Z"
    },
    {
        id: 123456791,
        node_id: "R_kgDOGj1234567892",
        name: "docs",
        full_name: "demo-user/docs",
        private: false,
        owner: demoUser,
        html_url: "https://github.com/demo-user/docs",
        description: "Documentation site",
        fork: false,
        language: "Markdown",
        stargazers_count: 8,
        forks_count: 2,
        open_issues_count: 0,
        default_branch: "main",
        archived: false,
        created_at: "2023-03-10T14:00:00Z",
        updated_at: "2024-01-15T09:00:00Z"
    }
];

// Sample issues for filterableData
const sampleIssues = [
    {
        id: 123456789,
        number: 42,
        title: "Bug: Login fails on mobile",
        state: "open",
        user: demoUser,
        labels: [{ name: "bug", color: "d73a4a" }],
        assignee: null,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-20T15:30:00Z"
    },
    {
        id: 123456790,
        number: 43,
        title: "Feature: Add dark mode",
        state: "open",
        user: demoUser,
        labels: [{ name: "enhancement", color: "a2eeef" }],
        assignee: developer1,
        created_at: "2024-01-16T11:00:00Z",
        updated_at: "2024-01-19T14:00:00Z"
    },
    {
        id: 123456791,
        number: 44,
        title: "Docs: Update README",
        state: "closed",
        user: developer1,
        labels: [{ name: "documentation", color: "0075ca" }],
        assignee: developer1,
        created_at: "2024-01-10T09:00:00Z",
        updated_at: "2024-01-12T16:00:00Z"
    }
];

// Sample pull requests for filterableData
const samplePullRequests = [
    {
        id: 987654321,
        number: 101,
        title: "Fix login bug on mobile",
        state: "open",
        user: developer1,
        head: { ref: "fix/mobile-login", sha: "abc123def456" },
        base: { ref: "main", sha: "789xyz000aaa" },
        draft: false,
        mergeable: true,
        created_at: "2024-01-18T10:00:00Z",
        updated_at: "2024-01-20T14:00:00Z"
    },
    {
        id: 987654322,
        number: 102,
        title: "Add dark mode support",
        state: "open",
        user: demoUser,
        head: { ref: "feature/dark-mode", sha: "def456ghi789" },
        base: { ref: "main", sha: "789xyz000aaa" },
        draft: true,
        mergeable: null,
        created_at: "2024-01-19T09:00:00Z",
        updated_at: "2024-01-20T11:00:00Z"
    }
];

// Sample workflows for filterableData
const sampleWorkflows = [
    {
        id: 12345,
        node_id: "W_kwDO12345",
        name: "CI",
        path: ".github/workflows/ci.yml",
        state: "active",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z"
    },
    {
        id: 12346,
        node_id: "W_kwDO12346",
        name: "Deploy",
        path: ".github/workflows/deploy.yml",
        state: "active",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2024-01-10T00:00:00Z"
    },
    {
        id: 12347,
        node_id: "W_kwDO12347",
        name: "Release",
        path: ".github/workflows/release.yml",
        state: "disabled_manually",
        created_at: "2023-06-01T00:00:00Z",
        updated_at: "2024-01-05T00:00:00Z"
    }
];

export const githubFixtures: TestFixture[] = [
    // ========== REPOSITORY OPERATIONS ==========
    {
        operationId: "listRepositories",
        provider: "github",
        filterableData: {
            records: sampleRepositories,
            recordsField: "repositories",
            defaultPageSize: 30,
            maxPageSize: 100
        },
        validCases: [
            {
                name: "list_user_repos",
                description: "List repositories for the authenticated user",
                input: {
                    type: "owner",
                    sort: "updated",
                    per_page: 30
                }
            },
            {
                name: "list_org_repos",
                description: "List repositories for an organization",
                input: {
                    org: "demo-org",
                    type: "all",
                    per_page: 50
                }
            }
        ],
        errorCases: [
            {
                name: "org_not_found",
                input: { org: "nonexistent-org" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "getRepository",
        provider: "github",
        validCases: [
            {
                name: "public_repo",
                description: "Get a public repository",
                input: { owner: "demo-user", repo: "demo-app" },
                expectedOutput: {
                    id: 123456789,
                    node_id: "R_kgDOGj1234567890",
                    name: "demo-app",
                    full_name: "demo-user/demo-app",
                    private: false,
                    owner: demoUser,
                    html_url: "https://github.com/demo-user/demo-app",
                    description: "A demo application",
                    fork: false,
                    language: "TypeScript",
                    default_branch: "main"
                }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "createRepository",
        provider: "github",
        validCases: [
            {
                name: "create_public_repo",
                description: "Create a new public repository",
                input: {
                    name: "new-project",
                    description: "A new project",
                    private: false,
                    auto_init: true
                },
                expectedOutput: {
                    id: 123456800,
                    name: "new-project",
                    full_name: "demo-user/new-project",
                    private: false,
                    owner: demoUser,
                    html_url: "https://github.com/demo-user/new-project",
                    description: "A new project",
                    default_branch: "main"
                }
            },
            {
                name: "create_private_repo",
                description: "Create a new private repository",
                input: {
                    name: "secret-project",
                    description: "A private project",
                    private: true
                },
                expectedOutput: {
                    id: 123456801,
                    name: "secret-project",
                    full_name: "demo-user/secret-project",
                    private: true,
                    owner: demoUser,
                    html_url: "https://github.com/demo-user/secret-project"
                }
            }
        ],
        errorCases: [
            {
                name: "name_already_exists",
                input: { name: "demo-app" },
                expectedError: {
                    type: "validation",
                    message: "Repository creation failed. Name already exists on this account",
                    retryable: false
                }
            },
            {
                name: "invalid_name",
                input: { name: "invalid..name" },
                expectedError: {
                    type: "validation",
                    message: "Repository name is invalid",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updateRepository",
        provider: "github",
        validCases: [
            {
                name: "update_description",
                description: "Update repository description",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    description: "Updated description"
                },
                expectedOutput: {
                    id: 123456789,
                    name: "demo-app",
                    full_name: "demo-user/demo-app",
                    description: "Updated description"
                }
            },
            {
                name: "update_visibility",
                description: "Change repository visibility",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    private: true
                },
                expectedOutput: {
                    id: 123456789,
                    name: "demo-app",
                    private: true
                }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent", description: "test" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "deleteRepository",
        provider: "github",
        validCases: [
            {
                name: "delete_repo",
                description: "Delete a repository",
                input: { owner: "demo-user", repo: "old-project" },
                expectedOutput: { success: true }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            },
            {
                name: "no_permission",
                input: { owner: "other-user", repo: "their-repo" },
                expectedError: {
                    type: "permission",
                    message: "Must have admin rights to Repository",
                    retryable: false
                }
            }
        ]
    },

    // ========== ISSUE OPERATIONS ==========
    {
        operationId: "listIssues",
        provider: "github",
        filterableData: {
            records: sampleIssues,
            recordsField: "issues",
            defaultPageSize: 30,
            maxPageSize: 100
        },
        validCases: [
            {
                name: "list_open_issues",
                description: "List open issues in a repository",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    state: "open"
                }
            },
            {
                name: "list_all_issues",
                description: "List all issues with filters",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    state: "all",
                    labels: "bug",
                    sort: "updated",
                    direction: "desc"
                }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent", state: "open" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "getIssue",
        provider: "github",
        validCases: [
            {
                name: "get_open_issue",
                description: "Get an open issue by number",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 42 },
                expectedOutput: {
                    id: 123456789,
                    number: 42,
                    state: "open",
                    title: "Bug: Login fails on mobile",
                    body: "Users report login issues on iOS devices.",
                    user: demoUser,
                    labels: [{ name: "bug", color: "d73a4a" }],
                    html_url: "https://github.com/demo-user/demo-app/issues/42"
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 9999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "createIssue",
        provider: "github",
        validCases: [
            {
                name: "simple_issue",
                description: "Create a simple issue with title and body",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "Bug: Login fails on mobile",
                    body: "Users report login issues on iOS devices."
                },
                // Normalized output matching executeCreateIssue return format
                expectedOutput: {
                    id: 123456789,
                    number: 42,
                    title: "Bug: Login fails on mobile",
                    body: "Users report login issues on iOS devices.",
                    url: "https://github.com/demo-user/demo-app/issues/42",
                    state: "open",
                    createdAt: "{{iso}}"
                }
            },
            {
                name: "issue_with_labels",
                description: "Create an issue with labels and assignees",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "Feature: Add dark mode",
                    body: "Implement dark mode for the application.",
                    labels: ["enhancement", "ui"],
                    assignees: ["developer1"]
                },
                // Normalized output matching executeCreateIssue return format
                expectedOutput: {
                    id: 123456790,
                    number: 43,
                    title: "Feature: Add dark mode",
                    body: "Implement dark mode for the application.",
                    url: "https://github.com/demo-user/demo-app/issues/43",
                    state: "open",
                    createdAt: "{{iso}}"
                }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent", title: "Test" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            },
            {
                name: "no_permission",
                input: { owner: "other-org", repo: "private-repo", title: "Test" },
                expectedError: {
                    type: "permission",
                    message: "Resource not accessible by integration",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                input: { owner: "demo-user", repo: "demo-app", title: "Test" },
                expectedError: {
                    type: "rate_limit",
                    message: "API rate limit exceeded",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "updateIssue",
        provider: "github",
        validCases: [
            {
                name: "update_title",
                description: "Update issue title",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    issue_number: 42,
                    title: "Bug: Login fails on mobile devices"
                },
                expectedOutput: {
                    id: 123456789,
                    number: 42,
                    title: "Bug: Login fails on mobile devices"
                }
            },
            {
                name: "assign_issue",
                description: "Assign users to an issue",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    issue_number: 42,
                    assignees: ["developer1"]
                },
                expectedOutput: {
                    id: 123456789,
                    number: 42,
                    assignees: [developer1]
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 9999, title: "Test" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "closeIssue",
        provider: "github",
        validCases: [
            // More specific case first (with state_reason param)
            {
                name: "close_as_not_planned",
                description: "Close an issue as not planned",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    issue_number: 42,
                    state_reason: "not_planned"
                },
                expectedOutput: {
                    id: 123456789,
                    number: 42,
                    state: "closed",
                    state_reason: "not_planned"
                }
            },
            // Less specific case (default)
            {
                name: "close_issue",
                description: "Close an open issue",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 42 },
                expectedOutput: {
                    id: 123456789,
                    number: 42,
                    state: "closed",
                    state_reason: "completed"
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 9999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "reopenIssue",
        provider: "github",
        validCases: [
            {
                name: "reopen_issue",
                description: "Reopen a closed issue",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 44 },
                expectedOutput: {
                    id: 123456791,
                    number: 44,
                    state: "open",
                    state_reason: "reopened"
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 9999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "addComment",
        provider: "github",
        validCases: [
            {
                name: "add_comment",
                description: "Add a comment to an issue",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    issue_number: 42,
                    body: "Thanks for reporting this issue!"
                },
                expectedOutput: {
                    id: 111222333,
                    node_id: "IC_kwDO111222333",
                    body: "Thanks for reporting this issue!",
                    user: demoUser,
                    html_url:
                        "https://github.com/demo-user/demo-app/issues/42#issuecomment-111222333",
                    created_at: "{{timestamp}}",
                    updated_at: "{{timestamp}}"
                }
            }
        ],
        errorCases: [
            {
                name: "issue_not_found",
                input: { owner: "demo-user", repo: "demo-app", issue_number: 9999, body: "Test" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },

    // ========== PULL REQUEST OPERATIONS ==========
    {
        operationId: "listPullRequests",
        provider: "github",
        filterableData: {
            records: samplePullRequests,
            recordsField: "pull_requests",
            defaultPageSize: 30,
            maxPageSize: 100
        },
        validCases: [
            {
                name: "list_open_prs",
                description: "List open pull requests",
                input: { owner: "demo-user", repo: "demo-app", state: "open" }
            },
            {
                name: "list_all_prs",
                description: "List all pull requests with sorting",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    state: "all",
                    sort: "updated",
                    direction: "desc"
                }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent", state: "open" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "getPullRequest",
        provider: "github",
        validCases: [
            {
                name: "get_pr",
                description: "Get a pull request by number",
                input: { owner: "demo-user", repo: "demo-app", pull_number: 101 },
                expectedOutput: {
                    id: 987654321,
                    number: 101,
                    state: "open",
                    title: "Fix login bug on mobile",
                    user: developer1,
                    head: { ref: "fix/mobile-login", sha: "abc123def456" },
                    base: { ref: "main", sha: "789xyz000aaa" },
                    draft: false,
                    mergeable: true,
                    html_url: "https://github.com/demo-user/demo-app/pull/101"
                }
            }
        ],
        errorCases: [
            {
                name: "pr_not_found",
                input: { owner: "demo-user", repo: "demo-app", pull_number: 9999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "createPullRequest",
        provider: "github",
        validCases: [
            {
                name: "create_pr",
                description: "Create a new pull request",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "Add new feature",
                    head: "feature/new-feature",
                    base: "main",
                    body: "This PR adds a new feature."
                },
                expectedOutput: {
                    id: 987654330,
                    number: 103,
                    state: "open",
                    title: "Add new feature",
                    head: { ref: "feature/new-feature" },
                    base: { ref: "main" },
                    draft: false,
                    html_url: "https://github.com/demo-user/demo-app/pull/103"
                }
            },
            {
                name: "create_draft_pr",
                description: "Create a draft pull request",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "WIP: New feature",
                    head: "feature/wip",
                    base: "main",
                    draft: true
                },
                expectedOutput: {
                    id: 987654331,
                    number: 104,
                    state: "open",
                    draft: true,
                    html_url: "https://github.com/demo-user/demo-app/pull/104"
                }
            }
        ],
        errorCases: [
            {
                name: "no_commits",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "Test",
                    head: "main",
                    base: "main"
                },
                expectedError: {
                    type: "validation",
                    message: "No commits between main and main",
                    retryable: false
                }
            },
            {
                name: "branch_not_found",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    title: "Test",
                    head: "nonexistent-branch",
                    base: "main"
                },
                expectedError: {
                    type: "validation",
                    message: "Head sha can't be blank",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "updatePullRequest",
        provider: "github",
        validCases: [
            {
                name: "update_pr_title",
                description: "Update pull request title",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 101,
                    title: "Fix: Mobile login issue"
                },
                expectedOutput: {
                    id: 987654321,
                    number: 101,
                    title: "Fix: Mobile login issue"
                }
            },
            {
                name: "mark_ready_for_review",
                description: "Mark draft PR as ready for review",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 102
                },
                expectedOutput: {
                    id: 987654322,
                    number: 102,
                    draft: false
                }
            }
        ],
        errorCases: [
            {
                name: "pr_not_found",
                input: { owner: "demo-user", repo: "demo-app", pull_number: 9999, title: "Test" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "mergePullRequest",
        provider: "github",
        validCases: [
            {
                name: "merge_pr",
                description: "Merge a pull request",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 101,
                    commit_title: "Merge PR #101: Fix mobile login",
                    merge_method: "squash"
                },
                expectedOutput: {
                    sha: "abc123def456789",
                    merged: true,
                    message: "Pull Request successfully merged"
                }
            }
        ],
        errorCases: [
            {
                name: "not_mergeable",
                input: { owner: "demo-user", repo: "demo-app", pull_number: 102 },
                expectedError: {
                    type: "validation",
                    message: "Pull Request is not mergeable",
                    retryable: false
                }
            },
            {
                name: "merge_conflict",
                input: { owner: "demo-user", repo: "demo-app", pull_number: 101 },
                expectedError: {
                    type: "validation",
                    message: "Merge conflict detected",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "createReview",
        provider: "github",
        validCases: [
            {
                name: "approve_pr",
                description: "Approve a pull request",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 101,
                    event: "APPROVE",
                    body: "LGTM!"
                },
                expectedOutput: {
                    id: 555666777,
                    node_id: "PRR_kwDO555666777",
                    user: demoUser,
                    body: "LGTM!",
                    state: "APPROVED",
                    html_url:
                        "https://github.com/demo-user/demo-app/pull/101#pullrequestreview-555666777"
                }
            },
            {
                name: "request_changes",
                description: "Request changes on a pull request",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 101,
                    event: "REQUEST_CHANGES",
                    body: "Please fix the issue mentioned in comments."
                },
                expectedOutput: {
                    id: 555666778,
                    user: demoUser,
                    body: "Please fix the issue mentioned in comments.",
                    state: "CHANGES_REQUESTED"
                }
            }
        ],
        errorCases: [
            {
                name: "pr_not_found",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 9999,
                    event: "APPROVE"
                },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "addReviewComment",
        provider: "github",
        validCases: [
            {
                name: "add_line_comment",
                description: "Add a comment on a specific line",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 101,
                    body: "Consider using a constant here.",
                    path: "src/index.ts",
                    line: 42
                },
                expectedOutput: {
                    id: 888999000,
                    node_id: "PRRC_kwDO888999000",
                    body: "Consider using a constant here.",
                    path: "src/index.ts",
                    line: 42,
                    user: demoUser,
                    html_url: "https://github.com/demo-user/demo-app/pull/101#discussion_r888999000"
                }
            }
        ],
        errorCases: [
            {
                name: "pr_not_found",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    pull_number: 9999,
                    body: "Test",
                    path: "file.ts",
                    line: 1
                },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },

    // ========== WORKFLOW OPERATIONS ==========
    {
        operationId: "listWorkflows",
        provider: "github",
        filterableData: {
            records: sampleWorkflows,
            recordsField: "workflows",
            defaultPageSize: 30,
            maxPageSize: 100
        },
        validCases: [
            {
                name: "list_workflows",
                description: "List all workflows in a repository",
                input: { owner: "demo-user", repo: "demo-app" }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "getWorkflow",
        provider: "github",
        validCases: [
            {
                name: "get_workflow",
                description: "Get a specific workflow",
                input: { owner: "demo-user", repo: "demo-app", workflow_id: 12345 },
                expectedOutput: {
                    id: 12345,
                    node_id: "W_kwDO12345",
                    name: "CI",
                    path: ".github/workflows/ci.yml",
                    state: "active",
                    html_url: "https://github.com/demo-user/demo-app/actions/workflows/ci.yml"
                }
            }
        ],
        errorCases: [
            {
                name: "workflow_not_found",
                input: { owner: "demo-user", repo: "demo-app", workflow_id: 99999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "triggerWorkflow",
        provider: "github",
        validCases: [
            {
                name: "trigger_workflow",
                description: "Trigger a workflow dispatch event",
                input: {
                    owner: "demo-user",
                    repo: "demo-app",
                    workflow_id: 12345,
                    ref: "main",
                    inputs: { environment: "staging" }
                },
                expectedOutput: { success: true }
            }
        ],
        errorCases: [
            {
                name: "workflow_not_found",
                input: { owner: "demo-user", repo: "demo-app", workflow_id: 99999, ref: "main" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            },
            {
                name: "workflow_disabled",
                input: { owner: "demo-user", repo: "demo-app", workflow_id: 12347, ref: "main" },
                expectedError: {
                    type: "validation",
                    message: "Workflow is disabled",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listWorkflowRuns",
        provider: "github",
        filterableData: {
            records: [
                {
                    id: 111222333,
                    name: "CI",
                    head_branch: "main",
                    run_number: 42,
                    status: "completed",
                    conclusion: "success",
                    workflow_id: 12345,
                    created_at: "2024-01-20T10:00:00Z",
                    updated_at: "2024-01-20T10:05:00Z"
                },
                {
                    id: 111222334,
                    name: "CI",
                    head_branch: "feature/new",
                    run_number: 43,
                    status: "in_progress",
                    conclusion: null,
                    workflow_id: 12345,
                    created_at: "2024-01-20T11:00:00Z",
                    updated_at: "2024-01-20T11:02:00Z"
                }
            ],
            recordsField: "workflow_runs",
            defaultPageSize: 30,
            maxPageSize: 100
        },
        validCases: [
            {
                name: "list_runs",
                description: "List workflow runs",
                input: { owner: "demo-user", repo: "demo-app" }
            },
            {
                name: "list_runs_for_workflow",
                description: "List runs for a specific workflow",
                input: { owner: "demo-user", repo: "demo-app", workflow_id: 12345 }
            }
        ],
        errorCases: [
            {
                name: "repo_not_found",
                input: { owner: "demo-user", repo: "nonexistent" },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "getWorkflowRun",
        provider: "github",
        validCases: [
            {
                name: "get_run",
                description: "Get a specific workflow run",
                input: { owner: "demo-user", repo: "demo-app", run_id: 111222333 },
                expectedOutput: {
                    id: 111222333,
                    name: "CI",
                    head_branch: "main",
                    run_number: 42,
                    status: "completed",
                    conclusion: "success",
                    workflow_id: 12345,
                    html_url: "https://github.com/demo-user/demo-app/actions/runs/111222333"
                }
            }
        ],
        errorCases: [
            {
                name: "run_not_found",
                input: { owner: "demo-user", repo: "demo-app", run_id: 999999999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            }
        ]
    },
    {
        operationId: "getWorkflowLogs",
        provider: "github",
        validCases: [
            {
                name: "get_logs",
                description: "Get logs for a workflow run",
                input: { owner: "demo-user", repo: "demo-app", run_id: 111222333 },
                expectedOutput: {
                    url: "https://pipelines.actions.githubusercontent.com/serviceHosts/...",
                    content:
                        "Build started...\nInstalling dependencies...\nRunning tests...\nBuild completed successfully."
                }
            }
        ],
        errorCases: [
            {
                name: "run_not_found",
                input: { owner: "demo-user", repo: "demo-app", run_id: 999999999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            },
            {
                name: "logs_expired",
                input: { owner: "demo-user", repo: "demo-app", run_id: 111222333 },
                expectedError: {
                    type: "not_found",
                    message: "Logs have expired and are no longer available",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "cancelWorkflowRun",
        provider: "github",
        validCases: [
            {
                name: "cancel_run",
                description: "Cancel a workflow run",
                input: { owner: "demo-user", repo: "demo-app", run_id: 111222334 },
                expectedOutput: { success: true }
            }
        ],
        errorCases: [
            {
                name: "run_not_found",
                input: { owner: "demo-user", repo: "demo-app", run_id: 999999999 },
                expectedError: { type: "not_found", message: "Not Found", retryable: false }
            },
            {
                name: "run_already_completed",
                input: { owner: "demo-user", repo: "demo-app", run_id: 111222333 },
                expectedError: {
                    type: "validation",
                    message: "Cannot cancel a workflow run that is not in progress",
                    retryable: false
                }
            }
        ]
    }
];
