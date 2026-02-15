/**
 * GitHub Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Repository operations
import { executeAddComment, addCommentSchema } from "../operations/issues/addComment";
import { executeCloseIssue, closeIssueSchema } from "../operations/issues/closeIssue";
import { executeCreateIssue, createIssueSchema } from "../operations/issues/createIssue";
import { executeGetIssue, getIssueSchema } from "../operations/issues/getIssue";
import { executeListIssues, listIssuesSchema } from "../operations/issues/listIssues";
import { executeReopenIssue, reopenIssueSchema } from "../operations/issues/reopenIssue";
import { executeUpdateIssue, updateIssueSchema } from "../operations/issues/updateIssue";
import {
    executeListPullRequests,
    listPullRequestsSchema
} from "../operations/pull-requests/listPullRequests";
import {
    executeCreateRepository,
    createRepositorySchema
} from "../operations/repositories/createRepository";
import {
    executeGetRepository,
    getRepositorySchema
} from "../operations/repositories/getRepository";
import {
    executeListRepositories,
    listRepositoriesSchema
} from "../operations/repositories/listRepositories";
import {
    executeUpdateRepository,
    updateRepositorySchema
} from "../operations/repositories/updateRepository";
import {
    executeDeleteRepository,
    deleteRepositorySchema
} from "../operations/repositories/deleteRepository";

// Issue operations

// Pull request operations
import {
    executeGetPullRequest,
    getPullRequestSchema
} from "../operations/pull-requests/getPullRequest";
import {
    executeCreatePullRequest,
    createPullRequestSchema
} from "../operations/pull-requests/createPullRequest";
import {
    executeUpdatePullRequest,
    updatePullRequestSchema
} from "../operations/pull-requests/updatePullRequest";
import {
    executeMergePullRequest,
    mergePullRequestSchema
} from "../operations/pull-requests/mergePullRequest";
import { executeCreateReview, createReviewSchema } from "../operations/pull-requests/createReview";
import {
    executeAddReviewComment,
    addReviewCommentSchema
} from "../operations/pull-requests/addReviewComment";

// Workflow operations
import {
    executeCancelWorkflowRun,
    cancelWorkflowRunSchema
} from "../operations/workflows/cancelWorkflowRun";
import { executeGetWorkflow, getWorkflowSchema } from "../operations/workflows/getWorkflow";
import {
    executeGetWorkflowLogs,
    getWorkflowLogsSchema
} from "../operations/workflows/getWorkflowLogs";
import {
    executeGetWorkflowRun,
    getWorkflowRunSchema
} from "../operations/workflows/getWorkflowRun";
import {
    executeListWorkflowRuns,
    listWorkflowRunsSchema
} from "../operations/workflows/listWorkflowRuns";
import { executeListWorkflows, listWorkflowsSchema } from "../operations/workflows/listWorkflows";
import {
    executeTriggerWorkflow,
    triggerWorkflowSchema
} from "../operations/workflows/triggerWorkflow";

import type { GitHubClient } from "../client/GitHubClient";

// Mock GitHubClient factory
function createMockGitHubClient(): jest.Mocked<GitHubClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        getAllPages: jest.fn()
    } as unknown as jest.Mocked<GitHubClient>;
}

// Test fixtures
const mockUser = {
    login: "demo-user",
    id: 12345678,
    node_id: "MDQ6VXNlcjEyMzQ1Njc4",
    avatar_url: "https://avatars.githubusercontent.com/u/12345678?v=4",
    gravatar_id: "",
    url: "https://api.github.com/users/demo-user",
    html_url: "https://github.com/demo-user",
    type: "User",
    site_admin: false
};

const mockRepository = {
    id: 123456789,
    node_id: "R_kgDOGj1234567890",
    name: "demo-app",
    full_name: "demo-user/demo-app",
    private: false,
    owner: mockUser,
    html_url: "https://github.com/demo-user/demo-app",
    description: "A demo application",
    fork: false,
    url: "https://api.github.com/repos/demo-user/demo-app",
    created_at: "2023-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z",
    pushed_at: "2024-01-20T14:00:00Z",
    homepage: null,
    size: 1024,
    stargazers_count: 42,
    watchers_count: 42,
    language: "TypeScript",
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: false,
    forks_count: 10,
    archived: false,
    disabled: false,
    open_issues_count: 5,
    license: null,
    topics: ["typescript", "react"],
    visibility: "public",
    default_branch: "main"
};

const mockIssue = {
    id: 123456789,
    node_id: "I_kwDOGj1234567890",
    url: "https://api.github.com/repos/demo-user/demo-app/issues/42",
    repository_url: "https://api.github.com/repos/demo-user/demo-app",
    labels_url: "https://api.github.com/repos/demo-user/demo-app/issues/42/labels{/name}",
    comments_url: "https://api.github.com/repos/demo-user/demo-app/issues/42/comments",
    events_url: "https://api.github.com/repos/demo-user/demo-app/issues/42/events",
    html_url: "https://github.com/demo-user/demo-app/issues/42",
    number: 42,
    state: "open",
    state_reason: null,
    title: "Bug: Login fails on mobile",
    body: "Users report login issues on iOS devices.",
    user: mockUser,
    labels: [
        {
            id: 1,
            node_id: "L_1",
            url: "https://api.github.com/repos/demo-user/demo-app/labels/bug",
            name: "bug",
            color: "d73a4a",
            default: true,
            description: "Something isn't working"
        }
    ],
    assignee: null,
    assignees: [],
    milestone: null,
    locked: false,
    comments: 5,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z",
    closed_at: null,
    author_association: "OWNER"
};

const mockComment = {
    id: 111222333,
    node_id: "IC_kwDO111222333",
    url: "https://api.github.com/repos/demo-user/demo-app/issues/comments/111222333",
    html_url: "https://github.com/demo-user/demo-app/issues/42#issuecomment-111222333",
    body: "Thanks for reporting this issue!",
    user: mockUser,
    created_at: "2024-01-20T16:00:00Z",
    updated_at: "2024-01-20T16:00:00Z",
    author_association: "OWNER"
};

const mockPullRequest = {
    id: 987654321,
    node_id: "PR_kwDO987654321",
    url: "https://api.github.com/repos/demo-user/demo-app/pulls/101",
    html_url: "https://github.com/demo-user/demo-app/pull/101",
    diff_url: "https://github.com/demo-user/demo-app/pull/101.diff",
    patch_url: "https://github.com/demo-user/demo-app/pull/101.patch",
    issue_url: "https://api.github.com/repos/demo-user/demo-app/issues/101",
    number: 101,
    state: "open",
    locked: false,
    title: "Fix login bug on mobile",
    user: mockUser,
    body: "This PR fixes the mobile login issue.",
    created_at: "2024-01-18T10:00:00Z",
    updated_at: "2024-01-20T14:00:00Z",
    closed_at: null,
    merged_at: null,
    merge_commit_sha: null,
    assignee: null,
    assignees: [],
    requested_reviewers: [],
    labels: [],
    milestone: null,
    draft: false,
    head: {
        label: "demo-user:fix/mobile-login",
        ref: "fix/mobile-login",
        sha: "abc123def456",
        user: mockUser,
        repo: mockRepository
    },
    base: {
        label: "demo-user:main",
        ref: "main",
        sha: "789xyz000aaa",
        user: mockUser,
        repo: mockRepository
    },
    merged: false,
    mergeable: true,
    rebaseable: true,
    mergeable_state: "clean",
    merged_by: null,
    comments: 2,
    review_comments: 1,
    maintainer_can_modify: true,
    commits: 3,
    additions: 50,
    deletions: 10,
    changed_files: 5
};

const mockReview = {
    id: 555666777,
    node_id: "PRR_kwDO555666777",
    user: mockUser,
    body: "LGTM!",
    state: "APPROVED",
    html_url: "https://github.com/demo-user/demo-app/pull/101#pullrequestreview-555666777",
    pull_request_url: "https://api.github.com/repos/demo-user/demo-app/pulls/101",
    submitted_at: "2024-01-20T16:00:00Z",
    commit_id: "abc123def456",
    author_association: "OWNER"
};

const mockWorkflow = {
    id: 12345,
    node_id: "W_kwDO12345",
    name: "CI",
    path: ".github/workflows/ci.yml",
    state: "active",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
    url: "https://api.github.com/repos/demo-user/demo-app/actions/workflows/12345",
    html_url: "https://github.com/demo-user/demo-app/actions/workflows/ci.yml",
    badge_url: "https://github.com/demo-user/demo-app/workflows/CI/badge.svg"
};

const mockWorkflowRun = {
    id: 111222333,
    name: "CI",
    node_id: "WR_kwDO111222333",
    head_branch: "main",
    head_sha: "abc123def456",
    run_number: 42,
    event: "push",
    status: "completed",
    conclusion: "success",
    workflow_id: 12345,
    url: "https://api.github.com/repos/demo-user/demo-app/actions/runs/111222333",
    html_url: "https://github.com/demo-user/demo-app/actions/runs/111222333",
    created_at: "2024-01-20T10:00:00Z",
    updated_at: "2024-01-20T10:05:00Z",
    run_started_at: "2024-01-20T10:00:00Z"
};

describe("GitHub Operation Executors", () => {
    let mockClient: jest.Mocked<GitHubClient>;

    beforeEach(() => {
        mockClient = createMockGitHubClient();
    });

    // ==========================================================================
    // REPOSITORY OPERATIONS
    // ==========================================================================

    describe("executeListRepositories", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce([mockRepository]);

            await executeListRepositories(mockClient, {
                visibility: "all",
                affiliation: "owner",
                sort: "updated",
                direction: "desc",
                per_page: 30,
                page: 1
            });

            expect(mockClient.get).toHaveBeenCalledWith("/user/repos", {
                visibility: "all",
                affiliation: "owner",
                sort: "updated",
                direction: "desc",
                per_page: 30,
                page: 1
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce([mockRepository]);

            const result = await executeListRepositories(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.repositories).toHaveLength(1);
            expect(result.data.repositories[0]).toEqual({
                id: mockRepository.id,
                name: mockRepository.name,
                full_name: mockRepository.full_name,
                private: mockRepository.private,
                html_url: mockRepository.html_url,
                description: mockRepository.description,
                created_at: mockRepository.created_at,
                updated_at: mockRepository.updated_at,
                stargazers_count: mockRepository.stargazers_count,
                forks_count: mockRepository.forks_count,
                language: mockRepository.language,
                default_branch: mockRepository.default_branch
            });
            expect(result.data.count).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeListRepositories(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeListRepositories(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list repositories");
        });
    });

    describe("executeGetRepository", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(mockRepository);

            await executeGetRepository(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repos/demo-user/demo-app");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(mockRepository);

            const result = await executeGetRepository(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(mockRepository.id);
            expect(result.data.name).toBe(mockRepository.name);
            expect(result.data.owner.login).toBe(mockUser.login);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Not Found"));

            const result = await executeGetRepository(mockClient, {
                owner: "demo-user",
                repo: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Not Found");
        });
    });

    describe("executeCreateRepository", () => {
        it("calls client with correct params for user repo", async () => {
            mockClient.post.mockResolvedValueOnce({
                ...mockRepository,
                clone_url: "https://github.com/demo-user/demo-app.git",
                ssh_url: "git@github.com:demo-user/demo-app.git"
            });

            await executeCreateRepository(mockClient, {
                name: "demo-app",
                description: "A demo application",
                private: false,
                auto_init: true
            });

            expect(mockClient.post).toHaveBeenCalledWith("/user/repos", {
                name: "demo-app",
                description: "A demo application",
                homepage: undefined,
                private: false,
                has_issues: true,
                has_projects: true,
                has_wiki: true,
                auto_init: true
            });
        });

        it("calls client with correct params for org repo", async () => {
            mockClient.post.mockResolvedValueOnce({
                ...mockRepository,
                clone_url: "https://github.com/demo-org/demo-app.git",
                ssh_url: "git@github.com:demo-org/demo-app.git"
            });

            await executeCreateRepository(mockClient, {
                name: "demo-app",
                org: "demo-org"
            });

            expect(mockClient.post).toHaveBeenCalledWith("/orgs/demo-org/repos", expect.anything());
        });

        it("returns normalized output on success", async () => {
            const repoWithUrls = {
                ...mockRepository,
                clone_url: "https://github.com/demo-user/demo-app.git",
                ssh_url: "git@github.com:demo-user/demo-app.git"
            };
            mockClient.post.mockResolvedValueOnce(repoWithUrls);

            const result = await executeCreateRepository(mockClient, {
                name: "demo-app"
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.id).toBe(mockRepository.id);
            expect(result.data.clone_url).toBe("https://github.com/demo-user/demo-app.git");
            expect(result.data.ssh_url).toBe("git@github.com:demo-user/demo-app.git");
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(
                new Error("Repository creation failed. Name already exists on this account")
            );

            const result = await executeCreateRepository(mockClient, {
                name: "demo-app"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateRepository", () => {
        it("calls client with correct params", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockRepository,
                description: "Updated description"
            });

            await executeUpdateRepository(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                description: "Updated description"
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/repos/demo-user/demo-app", {
                description: "Updated description"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockRepository,
                description: "Updated description"
            });

            const result = await executeUpdateRepository(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                description: "Updated description"
            });

            expect(result.success).toBe(true);
            expect(result.data?.description).toBe("Updated description");
        });
    });

    describe("executeDeleteRepository", () => {
        it("calls client with correct params", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            await executeDeleteRepository(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/repos/demo-user/demo-app");
        });

        it("returns success on deletion", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteRepository(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(result.success).toBe(true);
            expect(result.data?.message).toContain("deleted successfully");
        });

        it("returns error on client failure", async () => {
            mockClient.delete.mockRejectedValueOnce(
                new Error("Must have admin rights to Repository")
            );

            const result = await executeDeleteRepository(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ==========================================================================
    // ISSUE OPERATIONS
    // ==========================================================================

    describe("executeListIssues", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce([mockIssue]);

            await executeListIssues(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                state: "open",
                sort: "created",
                direction: "desc"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repos/demo-user/demo-app/issues", {
                state: "open",
                sort: "created",
                direction: "desc",
                per_page: undefined,
                page: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce([mockIssue]);

            const result = await executeListIssues(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(result.success).toBe(true);
            expect(result.data?.issues).toHaveLength(1);
            expect(result.data?.issues[0].number).toBe(42);
            expect(result.data?.issues[0].labels).toEqual(["bug"]);
        });

        it("passes optional filters", async () => {
            mockClient.get.mockResolvedValueOnce([]);

            await executeListIssues(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                labels: "bug,enhancement",
                assignee: "developer1"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/issues",
                expect.objectContaining({
                    labels: "bug,enhancement",
                    assignee: "developer1"
                })
            );
        });
    });

    describe("executeGetIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(mockIssue);

            await executeGetIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repos/demo-user/demo-app/issues/42");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(mockIssue);

            const result = await executeGetIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42
            });

            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(42);
            expect(result.data?.title).toBe("Bug: Login fails on mobile");
            expect(result.data?.user.login).toBe("demo-user");
        });
    });

    describe("executeCreateIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(mockIssue);

            await executeCreateIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                title: "Bug: Login fails on mobile",
                body: "Users report login issues."
            });

            expect(mockClient.post).toHaveBeenCalledWith("/repos/demo-user/demo-app/issues", {
                title: "Bug: Login fails on mobile",
                body: "Users report login issues."
            });
        });

        it("passes labels and assignees", async () => {
            mockClient.post.mockResolvedValueOnce(mockIssue);

            await executeCreateIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                title: "Test issue",
                labels: ["bug", "urgent"],
                assignees: ["developer1"]
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/issues",
                expect.objectContaining({
                    labels: ["bug", "urgent"],
                    assignees: ["developer1"]
                })
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockIssue);

            const result = await executeCreateIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                title: "Bug: Login fails on mobile"
            });

            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(42);
            expect(result.data?.url).toBe("https://github.com/demo-user/demo-app/issues/42");
        });
    });

    describe("executeUpdateIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockIssue,
                title: "Updated title"
            });

            await executeUpdateIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42,
                title: "Updated title"
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/repos/demo-user/demo-app/issues/42", {
                title: "Updated title"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockIssue,
                title: "Updated title"
            });

            const result = await executeUpdateIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42,
                title: "Updated title"
            });

            expect(result.success).toBe(true);
            expect(result.data?.title).toBe("Updated title");
        });
    });

    describe("executeCloseIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockIssue,
                state: "closed",
                state_reason: "completed"
            });

            await executeCloseIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/repos/demo-user/demo-app/issues/42", {
                state: "closed"
            });
        });

        it("passes state_reason when provided", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockIssue,
                state: "closed",
                state_reason: "not_planned"
            });

            await executeCloseIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42,
                state_reason: "not_planned"
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/repos/demo-user/demo-app/issues/42", {
                state: "closed",
                state_reason: "not_planned"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockIssue,
                state: "closed",
                state_reason: "completed",
                closed_at: "2024-01-21T10:00:00Z"
            });

            const result = await executeCloseIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42
            });

            expect(result.success).toBe(true);
            expect(result.data?.state).toBe("closed");
            expect(result.data?.state_reason).toBe("completed");
        });
    });

    describe("executeReopenIssue", () => {
        it("calls client with correct params", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockIssue,
                state: "open",
                state_reason: "reopened"
            });

            await executeReopenIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/repos/demo-user/demo-app/issues/42", {
                state: "open"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockIssue,
                state: "open",
                state_reason: "reopened"
            });

            const result = await executeReopenIssue(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42
            });

            expect(result.success).toBe(true);
            expect(result.data?.state).toBe("open");
        });
    });

    describe("executeAddComment", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(mockComment);

            await executeAddComment(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42,
                body: "Thanks for reporting this issue!"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/issues/42/comments",
                { body: "Thanks for reporting this issue!" }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockComment);

            const result = await executeAddComment(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                issue_number: 42,
                body: "Thanks for reporting this issue!"
            });

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe(111222333);
            expect(result.data?.body).toBe("Thanks for reporting this issue!");
            expect(result.data?.user.login).toBe("demo-user");
        });
    });

    // ==========================================================================
    // PULL REQUEST OPERATIONS
    // ==========================================================================

    describe("executeListPullRequests", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce([mockPullRequest]);

            await executeListPullRequests(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                state: "open",
                sort: "created",
                direction: "desc"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repos/demo-user/demo-app/pulls", {
                state: "open",
                sort: "created",
                direction: "desc",
                per_page: undefined,
                page: undefined
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce([mockPullRequest]);

            const result = await executeListPullRequests(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pull_requests).toHaveLength(1);
            expect(result.data?.pull_requests[0].number).toBe(101);
            expect(result.data?.pull_requests[0].head.ref).toBe("fix/mobile-login");
        });
    });

    describe("executeGetPullRequest", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(mockPullRequest);

            await executeGetPullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repos/demo-user/demo-app/pulls/101");
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(mockPullRequest);

            const result = await executeGetPullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101
            });

            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(101);
            expect(result.data?.mergeable).toBe(true);
            expect(result.data?.additions).toBe(50);
            expect(result.data?.deletions).toBe(10);
        });
    });

    describe("executeCreatePullRequest", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(mockPullRequest);

            await executeCreatePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                title: "Fix login bug on mobile",
                head: "fix/mobile-login",
                base: "main",
                body: "This PR fixes the mobile login issue."
            });

            expect(mockClient.post).toHaveBeenCalledWith("/repos/demo-user/demo-app/pulls", {
                title: "Fix login bug on mobile",
                head: "fix/mobile-login",
                base: "main",
                body: "This PR fixes the mobile login issue.",
                draft: undefined,
                maintainer_can_modify: undefined
            });
        });

        it("creates draft PR when specified", async () => {
            mockClient.post.mockResolvedValueOnce({ ...mockPullRequest, draft: true });

            await executeCreatePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                title: "WIP: New feature",
                head: "feature/new",
                base: "main",
                draft: true
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/pulls",
                expect.objectContaining({ draft: true })
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockPullRequest);

            const result = await executeCreatePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                title: "Fix login bug on mobile",
                head: "fix/mobile-login",
                base: "main"
            });

            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(101);
            expect(result.data?.html_url).toBe("https://github.com/demo-user/demo-app/pull/101");
        });
    });

    describe("executeUpdatePullRequest", () => {
        it("calls client with correct params", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockPullRequest,
                title: "Fix: Mobile login issue"
            });

            await executeUpdatePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                title: "Fix: Mobile login issue"
            });

            expect(mockClient.patch).toHaveBeenCalledWith("/repos/demo-user/demo-app/pulls/101", {
                title: "Fix: Mobile login issue"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.patch.mockResolvedValueOnce({
                ...mockPullRequest,
                title: "Fix: Mobile login issue"
            });

            const result = await executeUpdatePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                title: "Fix: Mobile login issue"
            });

            expect(result.success).toBe(true);
            expect(result.data?.title).toBe("Fix: Mobile login issue");
        });
    });

    describe("executeMergePullRequest", () => {
        it("calls client with correct params", async () => {
            mockClient.put.mockResolvedValueOnce({
                sha: "abc123def456789",
                merged: true,
                message: "Pull Request successfully merged"
            });

            await executeMergePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                merge_method: "squash"
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/pulls/101/merge",
                { merge_method: "squash" }
            );
        });

        it("passes optional commit_title and commit_message", async () => {
            mockClient.put.mockResolvedValueOnce({
                sha: "abc123def456789",
                merged: true,
                message: "Pull Request successfully merged"
            });

            await executeMergePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                commit_title: "Merge PR #101",
                commit_message: "Fixes mobile login issue"
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/pulls/101/merge",
                expect.objectContaining({
                    commit_title: "Merge PR #101",
                    commit_message: "Fixes mobile login issue"
                })
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.put.mockResolvedValueOnce({
                sha: "abc123def456789",
                merged: true,
                message: "Pull Request successfully merged"
            });

            const result = await executeMergePullRequest(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101
            });

            expect(result.success).toBe(true);
            expect(result.data?.merged).toBe(true);
            expect(result.data?.sha).toBe("abc123def456789");
        });
    });

    describe("executeCreateReview", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(mockReview);

            await executeCreateReview(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                event: "APPROVE",
                body: "LGTM!"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/pulls/101/reviews",
                { event: "APPROVE", body: "LGTM!" }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockReview);

            const result = await executeCreateReview(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                event: "APPROVE",
                body: "LGTM!"
            });

            expect(result.success).toBe(true);
            expect(result.data?.state).toBe("APPROVED");
            expect(result.data?.user.login).toBe("demo-user");
        });
    });

    describe("executeAddReviewComment", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce({
                ...mockComment,
                body: "Consider using a constant here."
            });

            await executeAddReviewComment(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                body: "Consider using a constant here.",
                commit_id: "abc123def456",
                path: "src/index.ts",
                line: 42
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/pulls/101/comments",
                {
                    body: "Consider using a constant here.",
                    commit_id: "abc123def456",
                    path: "src/index.ts",
                    side: undefined,
                    line: 42
                }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce({
                ...mockComment,
                body: "Consider using a constant here."
            });

            const result = await executeAddReviewComment(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                pull_number: 101,
                body: "Consider using a constant here.",
                commit_id: "abc123def456",
                path: "src/index.ts"
            });

            expect(result.success).toBe(true);
            expect(result.data?.body).toBe("Consider using a constant here.");
        });
    });

    // ==========================================================================
    // WORKFLOW OPERATIONS
    // ==========================================================================

    describe("executeListWorkflows", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                total_count: 1,
                workflows: [mockWorkflow]
            });

            await executeListWorkflows(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/workflows",
                { per_page: undefined, page: undefined }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                total_count: 1,
                workflows: [mockWorkflow]
            });

            const result = await executeListWorkflows(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(result.success).toBe(true);
            expect(result.data?.workflows).toHaveLength(1);
            expect(result.data?.workflows[0].name).toBe("CI");
            expect(result.data?.total_count).toBe(1);
        });
    });

    describe("executeGetWorkflow", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(mockWorkflow);

            await executeGetWorkflow(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                workflow_id: 12345
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/workflows/12345"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(mockWorkflow);

            const result = await executeGetWorkflow(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                workflow_id: 12345
            });

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe(12345);
            expect(result.data?.name).toBe("CI");
            expect(result.data?.state).toBe("active");
        });
    });

    describe("executeTriggerWorkflow", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            await executeTriggerWorkflow(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                workflow_id: 12345,
                ref: "main"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/workflows/12345/dispatches",
                { ref: "main" }
            );
        });

        it("passes inputs when provided", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            await executeTriggerWorkflow(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                workflow_id: 12345,
                ref: "main",
                inputs: { environment: "staging" }
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/workflows/12345/dispatches",
                { ref: "main", inputs: { environment: "staging" } }
            );
        });

        it("returns success message", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            const result = await executeTriggerWorkflow(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                workflow_id: 12345,
                ref: "main"
            });

            expect(result.success).toBe(true);
            expect(result.data?.message).toContain("triggered successfully");
        });
    });

    describe("executeListWorkflowRuns", () => {
        it("calls client with correct params for repo-level", async () => {
            mockClient.get.mockResolvedValueOnce({
                total_count: 1,
                workflow_runs: [mockWorkflowRun]
            });

            await executeListWorkflowRuns(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repos/demo-user/demo-app/actions/runs", {
                per_page: undefined,
                page: undefined
            });
        });

        it("calls client with correct params for workflow-level", async () => {
            mockClient.get.mockResolvedValueOnce({
                total_count: 1,
                workflow_runs: [mockWorkflowRun]
            });

            await executeListWorkflowRuns(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                workflow_id: 12345
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/workflows/12345/runs",
                { per_page: undefined, page: undefined }
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                total_count: 1,
                workflow_runs: [mockWorkflowRun]
            });

            const result = await executeListWorkflowRuns(mockClient, {
                owner: "demo-user",
                repo: "demo-app"
            });

            expect(result.success).toBe(true);
            expect(result.data?.workflow_runs).toHaveLength(1);
            expect(result.data?.workflow_runs[0].status).toBe("completed");
            expect(result.data?.workflow_runs[0].conclusion).toBe("success");
        });
    });

    describe("executeGetWorkflowRun", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce(mockWorkflowRun);

            await executeGetWorkflowRun(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                run_id: 111222333
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/runs/111222333"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.get.mockResolvedValueOnce(mockWorkflowRun);

            const result = await executeGetWorkflowRun(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                run_id: 111222333
            });

            expect(result.success).toBe(true);
            expect(result.data?.id).toBe(111222333);
            expect(result.data?.run_number).toBe(42);
            expect(result.data?.status).toBe("completed");
        });
    });

    describe("executeGetWorkflowLogs", () => {
        it("calls client with correct params", async () => {
            mockClient.get.mockResolvedValueOnce({
                url: "https://pipelines.actions.githubusercontent.com/logs/..."
            });

            await executeGetWorkflowLogs(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                run_id: 111222333
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/runs/111222333/logs"
            );
        });

        it("returns download URL on success", async () => {
            mockClient.get.mockResolvedValueOnce({
                url: "https://pipelines.actions.githubusercontent.com/logs/..."
            });

            const result = await executeGetWorkflowLogs(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                run_id: 111222333
            });

            expect(result.success).toBe(true);
            expect(result.data?.download_url).toBe(
                "https://pipelines.actions.githubusercontent.com/logs/..."
            );
        });

        it("falls back to github URL when no download URL", async () => {
            mockClient.get.mockResolvedValueOnce({});

            const result = await executeGetWorkflowLogs(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                run_id: 111222333
            });

            expect(result.success).toBe(true);
            expect(result.data?.download_url).toBe(
                "https://github.com/demo-user/demo-app/actions/runs/111222333"
            );
        });
    });

    describe("executeCancelWorkflowRun", () => {
        it("calls client with correct params", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            await executeCancelWorkflowRun(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                run_id: 111222333
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repos/demo-user/demo-app/actions/runs/111222333/cancel",
                {}
            );
        });

        it("returns success message", async () => {
            mockClient.post.mockResolvedValueOnce(undefined);

            const result = await executeCancelWorkflowRun(mockClient, {
                owner: "demo-user",
                repo: "demo-app",
                run_id: 111222333
            });

            expect(result.success).toBe(true);
            expect(result.data?.message).toContain("cancelled successfully");
        });
    });

    // ==========================================================================
    // SCHEMA VALIDATION
    // ==========================================================================

    describe("schema validation", () => {
        describe("repository schemas", () => {
            describe("listRepositoriesSchema", () => {
                it("validates empty input (all optional with defaults)", () => {
                    const result = listRepositoriesSchema.safeParse({});
                    expect(result.success).toBe(true);
                });

                it("validates with visibility", () => {
                    const result = listRepositoriesSchema.safeParse({ visibility: "private" });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid visibility", () => {
                    const result = listRepositoriesSchema.safeParse({ visibility: "invalid" });
                    expect(result.success).toBe(false);
                });
            });

            describe("getRepositorySchema", () => {
                it("validates required fields", () => {
                    const result = getRepositorySchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects missing owner", () => {
                    const result = getRepositorySchema.safeParse({ repo: "demo-app" });
                    expect(result.success).toBe(false);
                });

                it("rejects missing repo", () => {
                    const result = getRepositorySchema.safeParse({ owner: "demo-user" });
                    expect(result.success).toBe(false);
                });
            });

            describe("createRepositorySchema", () => {
                it("validates minimal input", () => {
                    const result = createRepositorySchema.safeParse({ name: "new-repo" });
                    expect(result.success).toBe(true);
                });

                it("validates full input", () => {
                    const result = createRepositorySchema.safeParse({
                        name: "new-repo",
                        description: "A new repository",
                        private: true,
                        auto_init: true,
                        gitignore_template: "Node",
                        license_template: "mit"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects empty name", () => {
                    const result = createRepositorySchema.safeParse({ name: "" });
                    expect(result.success).toBe(false);
                });
            });

            describe("updateRepositorySchema", () => {
                it("validates with required owner and repo", () => {
                    const result = updateRepositorySchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with optional fields", () => {
                    const result = updateRepositorySchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        description: "Updated description",
                        archived: true
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("deleteRepositorySchema", () => {
                it("validates required fields", () => {
                    const result = deleteRepositorySchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app"
                    });
                    expect(result.success).toBe(true);
                });
            });
        });

        describe("issue schemas", () => {
            describe("listIssuesSchema", () => {
                it("validates required fields", () => {
                    const result = listIssuesSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with filters", () => {
                    const result = listIssuesSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        state: "closed",
                        labels: "bug,enhancement"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid state", () => {
                    const result = listIssuesSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        state: "invalid"
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("getIssueSchema", () => {
                it("validates required fields", () => {
                    const result = getIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: 42
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects negative issue_number", () => {
                    const result = getIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: -1
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("createIssueSchema", () => {
                it("validates minimal input", () => {
                    const result = createIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        title: "Bug report"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates full input", () => {
                    const result = createIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        title: "Bug report",
                        body: "Description here",
                        labels: ["bug"],
                        assignees: ["developer1"]
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects empty title", () => {
                    const result = createIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        title: ""
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("closeIssueSchema", () => {
                it("validates without state_reason", () => {
                    const result = closeIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: 42
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with state_reason", () => {
                    const result = closeIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: 42,
                        state_reason: "not_planned"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid state_reason", () => {
                    const result = closeIssueSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: 42,
                        state_reason: "invalid"
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("addCommentSchema", () => {
                it("validates required fields", () => {
                    const result = addCommentSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: 42,
                        body: "Comment text"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects empty body", () => {
                    const result = addCommentSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        issue_number: 42,
                        body: ""
                    });
                    expect(result.success).toBe(false);
                });
            });
        });

        describe("pull request schemas", () => {
            describe("listPullRequestsSchema", () => {
                it("validates required fields", () => {
                    const result = listPullRequestsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with optional filters", () => {
                    const result = listPullRequestsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        state: "all",
                        head: "demo-user:feature-branch",
                        base: "main"
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("createPullRequestSchema", () => {
                it("validates required fields", () => {
                    const result = createPullRequestSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        title: "New feature",
                        head: "feature-branch",
                        base: "main"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with draft option", () => {
                    const result = createPullRequestSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        title: "WIP",
                        head: "wip-branch",
                        base: "main",
                        draft: true
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("mergePullRequestSchema", () => {
                it("validates required fields", () => {
                    const result = mergePullRequestSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        pull_number: 101
                    });
                    expect(result.success).toBe(true);
                });

                it("validates merge_method options", () => {
                    for (const method of ["merge", "squash", "rebase"]) {
                        const result = mergePullRequestSchema.safeParse({
                            owner: "demo-user",
                            repo: "demo-app",
                            pull_number: 101,
                            merge_method: method
                        });
                        expect(result.success).toBe(true);
                    }
                });

                it("rejects invalid merge_method", () => {
                    const result = mergePullRequestSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        pull_number: 101,
                        merge_method: "fast-forward"
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("createReviewSchema", () => {
                it("validates required fields", () => {
                    const result = createReviewSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        pull_number: 101,
                        event: "APPROVE"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates all event types", () => {
                    for (const event of ["APPROVE", "REQUEST_CHANGES", "COMMENT"]) {
                        const result = createReviewSchema.safeParse({
                            owner: "demo-user",
                            repo: "demo-app",
                            pull_number: 101,
                            event
                        });
                        expect(result.success).toBe(true);
                    }
                });

                it("rejects invalid event", () => {
                    const result = createReviewSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        pull_number: 101,
                        event: "REJECT"
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("addReviewCommentSchema", () => {
                it("validates required fields", () => {
                    const result = addReviewCommentSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        pull_number: 101,
                        body: "Comment",
                        commit_id: "abc123",
                        path: "src/file.ts"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with line number", () => {
                    const result = addReviewCommentSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        pull_number: 101,
                        body: "Comment",
                        commit_id: "abc123",
                        path: "src/file.ts",
                        line: 42,
                        side: "LEFT"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid side", () => {
                    const result = addReviewCommentSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        pull_number: 101,
                        body: "Comment",
                        commit_id: "abc123",
                        path: "src/file.ts",
                        side: "CENTER"
                    });
                    expect(result.success).toBe(false);
                });
            });
        });

        describe("workflow schemas", () => {
            describe("listWorkflowsSchema", () => {
                it("validates required fields", () => {
                    const result = listWorkflowsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with pagination", () => {
                    const result = listWorkflowsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        per_page: 50,
                        page: 2
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects per_page > 100", () => {
                    const result = listWorkflowsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        per_page: 200
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("getWorkflowSchema", () => {
                it("validates with numeric workflow_id", () => {
                    const result = getWorkflowSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        workflow_id: 12345
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with string workflow_id (filename)", () => {
                    const result = getWorkflowSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        workflow_id: "ci.yml"
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("triggerWorkflowSchema", () => {
                it("validates required fields", () => {
                    const result = triggerWorkflowSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        workflow_id: 12345,
                        ref: "main"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with inputs", () => {
                    const result = triggerWorkflowSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        workflow_id: 12345,
                        ref: "main",
                        inputs: {
                            environment: "staging",
                            debug: true,
                            count: 5
                        }
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("listWorkflowRunsSchema", () => {
                it("validates required fields", () => {
                    const result = listWorkflowRunsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app"
                    });
                    expect(result.success).toBe(true);
                });

                it("validates with filters", () => {
                    const result = listWorkflowRunsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        workflow_id: 12345,
                        branch: "main",
                        status: "completed",
                        conclusion: "success"
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects invalid status", () => {
                    const result = listWorkflowRunsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        status: "running"
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("getWorkflowRunSchema", () => {
                it("validates required fields", () => {
                    const result = getWorkflowRunSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        run_id: 111222333
                    });
                    expect(result.success).toBe(true);
                });

                it("rejects non-positive run_id", () => {
                    const result = getWorkflowRunSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        run_id: 0
                    });
                    expect(result.success).toBe(false);
                });
            });

            describe("getWorkflowLogsSchema", () => {
                it("validates required fields", () => {
                    const result = getWorkflowLogsSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        run_id: 111222333
                    });
                    expect(result.success).toBe(true);
                });
            });

            describe("cancelWorkflowRunSchema", () => {
                it("validates required fields", () => {
                    const result = cancelWorkflowRunSchema.safeParse({
                        owner: "demo-user",
                        repo: "demo-app",
                        run_id: 111222333
                    });
                    expect(result.success).toBe(true);
                });
            });
        });
    });
});
