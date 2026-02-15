/**
 * GitLab Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Project operations - import directly from individual files to get schemas

// Issue operations
import { executeCreateIssue, createIssueSchema } from "../operations/issues/createIssue";
import { executeGetIssue, getIssueSchema } from "../operations/issues/getIssue";
import { executeListIssues, listIssuesSchema } from "../operations/issues/listIssues";
import { executeUpdateIssue, updateIssueSchema } from "../operations/issues/updateIssue";

// Merge request operations
import {
    executeCreateMergeRequest,
    createMergeRequestSchema
} from "../operations/merge-requests/createMergeRequest";
import {
    executeGetMergeRequest,
    getMergeRequestSchema
} from "../operations/merge-requests/getMergeRequest";
import {
    executeListMergeRequests,
    listMergeRequestsSchema
} from "../operations/merge-requests/listMergeRequests";
import {
    executeMergeMergeRequest,
    mergeMergeRequestSchema
} from "../operations/merge-requests/mergeMergeRequest";

// Pipeline operations
import { executeListPipelines, listPipelinesSchema } from "../operations/pipelines/listPipelines";
import {
    executeTriggerPipeline,
    triggerPipelineSchema
} from "../operations/pipelines/triggerPipeline";
import { executeCreateProject, createProjectSchema } from "../operations/projects/createProject";
import { executeDeleteProject, deleteProjectSchema } from "../operations/projects/deleteProject";
import { executeGetProject, getProjectSchema } from "../operations/projects/getProject";
import { executeListProjects, listProjectsSchema } from "../operations/projects/listProjects";
import { executeUpdateProject, updateProjectSchema } from "../operations/projects/updateProject";
import type { GitLabClient } from "../client/GitLabClient";
import type {
    GitLabProject,
    GitLabIssue,
    GitLabMergeRequest,
    GitLabPipeline
} from "../operations/types";

// Mock GitLabClient factory
function createMockGitLabClient(): jest.Mocked<GitLabClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        encodeProjectPath: jest.fn((path: string) => {
            if (/^\d+$/.test(path)) {
                return path;
            }
            return encodeURIComponent(path);
        }),
        getInstanceUrl: jest.fn(() => "https://gitlab.com"),
        getAllPages: jest.fn()
    } as unknown as jest.Mocked<GitLabClient>;
}

// Test fixtures - sample API response data
const sampleUser = {
    id: 1001,
    username: "jdeveloper",
    name: "Jane Developer",
    state: "active",
    avatar_url: "https://gitlab.com/uploads/-/system/user/avatar/1001/avatar.png",
    web_url: "https://gitlab.com/jdeveloper"
};

const sampleNamespace = {
    id: 9876543,
    name: "Acme Corp",
    path: "acme-corp",
    kind: "group",
    full_path: "acme-corp",
    parent_id: null,
    avatar_url: null,
    web_url: "https://gitlab.com/groups/acme-corp"
};

const sampleProject: GitLabProject = {
    id: 12345678,
    name: "Backend API",
    path: "backend-api",
    path_with_namespace: "acme-corp/backend-api",
    name_with_namespace: "Acme Corp / Backend API",
    description: "Core backend API service",
    visibility: "private",
    web_url: "https://gitlab.com/acme-corp/backend-api",
    http_url_to_repo: "https://gitlab.com/acme-corp/backend-api.git",
    ssh_url_to_repo: "git@gitlab.com:acme-corp/backend-api.git",
    readme_url: "https://gitlab.com/acme-corp/backend-api/-/blob/main/README.md",
    default_branch: "main",
    created_at: "2023-06-15T08:00:00.000Z",
    last_activity_at: "2024-01-22T10:25:00.000Z",
    star_count: 15,
    forks_count: 3,
    open_issues_count: 12,
    namespace: sampleNamespace,
    archived: false,
    avatar_url: null,
    merge_requests_enabled: true,
    issues_enabled: true,
    wiki_enabled: true,
    jobs_enabled: true,
    snippets_enabled: true,
    container_registry_enabled: true,
    owner: sampleUser
};

const sampleMilestone = {
    id: 5001,
    iid: 3,
    project_id: 12345678,
    title: "v2.1.0",
    description: "Version 2.1.0 release",
    state: "active",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    due_date: "2024-03-01",
    start_date: "2024-01-01",
    web_url: "https://gitlab.com/acme-corp/backend-api/-/milestones/3"
};

const sampleIssue: GitLabIssue = {
    id: 98765432,
    iid: 42,
    project_id: 12345678,
    title: "Bug: Application crashes on startup",
    description: "The application crashes immediately after launching.",
    state: "opened",
    created_at: "2024-01-15T10:30:00.000Z",
    updated_at: "2024-01-16T09:15:00.000Z",
    closed_at: null,
    closed_by: null,
    labels: ["bug", "critical"],
    milestone: sampleMilestone,
    assignees: [sampleUser],
    author: sampleUser,
    type: "issue",
    assignee: sampleUser,
    user_notes_count: 3,
    merge_requests_count: 1,
    upvotes: 5,
    downvotes: 0,
    due_date: "2024-02-01",
    confidential: false,
    discussion_locked: null,
    issue_type: "issue",
    web_url: "https://gitlab.com/acme-corp/backend-api/-/issues/42",
    time_stats: {
        time_estimate: 14400,
        total_time_spent: 7200
    },
    task_completion_status: {
        count: 3,
        completed_count: 1
    },
    weight: 5,
    has_tasks: true,
    references: {
        short: "#42",
        relative: "#42",
        full: "acme-corp/backend-api#42"
    }
};

const sampleMergeRequest: GitLabMergeRequest = {
    id: 87654321,
    iid: 156,
    project_id: 12345678,
    title: "Add user authentication module",
    description: "This MR adds a complete user authentication module with JWT support.",
    state: "opened",
    created_at: "2024-01-20T09:00:00.000Z",
    updated_at: "2024-01-21T14:30:00.000Z",
    merged_by: null,
    merged_at: null,
    closed_by: null,
    closed_at: null,
    target_branch: "main",
    source_branch: "feature/add-user-authentication",
    user_notes_count: 5,
    upvotes: 2,
    downvotes: 0,
    author: sampleUser,
    assignees: [sampleUser],
    assignee: sampleUser,
    reviewers: [sampleUser],
    source_project_id: 12345678,
    target_project_id: 12345678,
    labels: ["feature", "needs-review"],
    draft: false,
    work_in_progress: false,
    milestone: sampleMilestone,
    merge_when_pipeline_succeeds: false,
    merge_status: "can_be_merged",
    sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    merge_commit_sha: null,
    squash_commit_sha: null,
    discussion_locked: null,
    should_remove_source_branch: null,
    force_remove_source_branch: false,
    reference: "!156",
    references: {
        short: "!156",
        relative: "!156",
        full: "acme-corp/backend-api!156"
    },
    web_url: "https://gitlab.com/acme-corp/backend-api/-/merge_requests/156",
    time_stats: {
        time_estimate: 28800,
        total_time_spent: 14400
    },
    squash: false,
    task_completion_status: {
        count: 4,
        completed_count: 3
    },
    has_conflicts: false,
    blocking_discussions_resolved: true
};

const samplePipeline: GitLabPipeline = {
    id: 456789012,
    iid: 1542,
    project_id: 12345678,
    sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    ref: "main",
    status: "success",
    source: "push",
    created_at: "2024-01-22T10:15:00.000Z",
    updated_at: "2024-01-22T10:25:00.000Z",
    web_url: "https://gitlab.com/acme-corp/backend-api/-/pipelines/456789012",
    before_sha: "0000000000000000000000000000000000000000",
    tag: false,
    yaml_errors: null,
    user: sampleUser,
    started_at: "2024-01-22T10:15:30.000Z",
    finished_at: "2024-01-22T10:25:00.000Z",
    committed_at: "2024-01-22T10:14:00.000Z",
    duration: 570,
    queued_duration: 30,
    coverage: "87.5"
};

describe("GitLab Operation Executors", () => {
    let mockClient: jest.Mocked<GitLabClient>;

    beforeEach(() => {
        mockClient = createMockGitLabClient();
    });

    // ============================================================
    // PROJECT OPERATIONS
    // ============================================================

    describe("executeListProjects", () => {
        it("calls client with default params", async () => {
            mockClient.get.mockResolvedValueOnce([sampleProject]);

            // Parse through schema to apply defaults (as would happen in production)
            const params = listProjectsSchema.parse({});
            await executeListProjects(mockClient, params);

            expect(mockClient.get).toHaveBeenCalledWith(
                "/projects",
                expect.objectContaining({
                    membership: true,
                    order_by: "last_activity_at",
                    sort: "desc",
                    per_page: 20,
                    page: 1
                })
            );
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce([sampleProject]);

            await executeListProjects(mockClient, {
                membership: false,
                owned: true,
                visibility: "private",
                search: "backend",
                order_by: "name",
                sort: "asc",
                per_page: 50,
                page: 2
            });

            expect(mockClient.get).toHaveBeenCalledWith("/projects", {
                membership: false,
                owned: true,
                visibility: "private",
                search: "backend",
                order_by: "name",
                sort: "asc",
                per_page: 50,
                page: 2
            });
        });

        it("returns normalized project output on success", async () => {
            mockClient.get.mockResolvedValueOnce([sampleProject]);

            const result = await executeListProjects(mockClient, {});

            expect(result.success).toBe(true);
            expect(result.data?.projects).toHaveLength(1);
            expect(result.data?.projects[0]).toEqual({
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
            });
            expect(result.data?.count).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeListProjects(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeListProjects(mockClient, {});

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list projects");
        });
    });

    describe("executeGetProject", () => {
        it("calls client with numeric project ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleProject);

            await executeGetProject(mockClient, { project_id: "12345678" });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.get).toHaveBeenCalledWith("/projects/12345678");
        });

        it("calls client with path-encoded project ID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleProject);

            await executeGetProject(mockClient, { project_id: "acme-corp/backend-api" });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("acme-corp/backend-api");
            expect(mockClient.get).toHaveBeenCalledWith("/projects/acme-corp%2Fbackend-api");
        });

        it("returns normalized project output on success", async () => {
            mockClient.get.mockResolvedValueOnce(sampleProject);

            const result = await executeGetProject(mockClient, { project_id: "12345678" });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 12345678,
                name: "Backend API",
                path: "backend-api",
                path_with_namespace: "acme-corp/backend-api",
                name_with_namespace: "Acme Corp / Backend API",
                description: "Core backend API service",
                visibility: "private",
                web_url: "https://gitlab.com/acme-corp/backend-api",
                http_url_to_repo: "https://gitlab.com/acme-corp/backend-api.git",
                ssh_url_to_repo: "git@gitlab.com:acme-corp/backend-api.git",
                default_branch: "main",
                issues_enabled: true,
                merge_requests_enabled: true,
                wiki_enabled: true,
                jobs_enabled: true
            });
            expect(result.data?.namespace).toEqual({
                id: 9876543,
                name: "Acme Corp",
                path: "acme-corp",
                kind: "group",
                full_path: "acme-corp"
            });
        });

        it("handles project without namespace", async () => {
            const projectWithoutNamespace = { ...sampleProject, namespace: undefined };
            mockClient.get.mockResolvedValueOnce(projectWithoutNamespace);

            const result = await executeGetProject(mockClient, { project_id: "12345678" });

            expect(result.success).toBe(true);
            expect(result.data?.namespace).toBeNull();
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 Project Not Found"));

            const result = await executeGetProject(mockClient, { project_id: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("404 Project Not Found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeCreateProject", () => {
        it("calls client with minimal params", async () => {
            const createdProject = { ...sampleProject, name: "new-project" };
            mockClient.post.mockResolvedValueOnce(createdProject);

            // Parse through schema to apply defaults
            const params = createProjectSchema.parse({ name: "new-project" });
            await executeCreateProject(mockClient, params);

            expect(mockClient.post).toHaveBeenCalledWith(
                "/projects",
                expect.objectContaining({
                    name: "new-project",
                    visibility: "private",
                    initialize_with_readme: false,
                    issues_enabled: true,
                    merge_requests_enabled: true,
                    wiki_enabled: true,
                    jobs_enabled: true
                })
            );
        });

        it("calls client with all params", async () => {
            const createdProject = { ...sampleProject, name: "new-project" };
            mockClient.post.mockResolvedValueOnce(createdProject);

            await executeCreateProject(mockClient, {
                name: "new-project",
                path: "new-proj",
                namespace_id: 12345,
                description: "A new project",
                visibility: "public",
                initialize_with_readme: true,
                default_branch: "develop",
                issues_enabled: false,
                merge_requests_enabled: true,
                wiki_enabled: false,
                jobs_enabled: true
            });

            expect(mockClient.post).toHaveBeenCalledWith("/projects", {
                name: "new-project",
                path: "new-proj",
                namespace_id: 12345,
                description: "A new project",
                visibility: "public",
                initialize_with_readme: true,
                default_branch: "develop",
                issues_enabled: false,
                merge_requests_enabled: true,
                wiki_enabled: false,
                jobs_enabled: true
            });
        });

        it("returns normalized project output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleProject);

            const result = await executeCreateProject(mockClient, { name: "Backend API" });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 12345678,
                name: "Backend API",
                path: "backend-api",
                path_with_namespace: "acme-corp/backend-api",
                description: "Core backend API service",
                visibility: "private",
                web_url: "https://gitlab.com/acme-corp/backend-api",
                http_url_to_repo: "https://gitlab.com/acme-corp/backend-api.git",
                ssh_url_to_repo: "git@gitlab.com:acme-corp/backend-api.git",
                default_branch: "main"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Path has already been taken"));

            const result = await executeCreateProject(mockClient, { name: "existing-project" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Path has already been taken");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateProject", () => {
        it("calls client with update data", async () => {
            mockClient.put.mockResolvedValueOnce(sampleProject);

            await executeUpdateProject(mockClient, {
                project_id: "12345678",
                description: "Updated description",
                visibility: "internal"
            });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.put).toHaveBeenCalledWith("/projects/12345678", {
                description: "Updated description",
                visibility: "internal"
            });
        });

        it("returns normalized project output on success", async () => {
            const updatedProject = { ...sampleProject, description: "Updated description" };
            mockClient.put.mockResolvedValueOnce(updatedProject);

            const result = await executeUpdateProject(mockClient, {
                project_id: "12345678",
                description: "Updated description"
            });

            expect(result.success).toBe(true);
            expect(result.data?.description).toBe("Updated description");
        });

        it("returns error on client failure", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("403 Forbidden"));

            const result = await executeUpdateProject(mockClient, {
                project_id: "other-org/project",
                name: "new-name"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("403 Forbidden");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteProject", () => {
        it("calls client delete with encoded project ID", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            await executeDeleteProject(mockClient, { project_id: "12345678" });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.delete).toHaveBeenCalledWith("/projects/12345678");
        });

        it("returns success response on delete", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteProject(mockClient, { project_id: "12345678" });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                project_id: "12345678"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.delete.mockRejectedValueOnce(
                new Error("403 Forbidden - Owner permission required")
            );

            const result = await executeDeleteProject(mockClient, {
                project_id: "other-org/project"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("403 Forbidden - Owner permission required");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================================
    // ISSUE OPERATIONS
    // ============================================================

    describe("executeListIssues", () => {
        it("calls client with project ID and default params", async () => {
            mockClient.get.mockResolvedValueOnce([sampleIssue]);

            // Parse through schema to apply defaults
            const params = listIssuesSchema.parse({ project_id: "12345678" });
            await executeListIssues(mockClient, params);

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.get).toHaveBeenCalledWith(
                "/projects/12345678/issues",
                expect.objectContaining({
                    state: "opened",
                    order_by: "created_at",
                    sort: "desc",
                    per_page: 20,
                    page: 1
                })
            );
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce([sampleIssue]);

            await executeListIssues(mockClient, {
                project_id: "12345678",
                state: "closed",
                labels: "bug,critical",
                assignee_id: 1001,
                order_by: "updated_at",
                sort: "asc",
                per_page: 50,
                page: 2
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/projects/12345678/issues",
                expect.objectContaining({
                    state: "closed",
                    labels: "bug,critical",
                    assignee_id: 1001,
                    order_by: "updated_at",
                    sort: "asc",
                    per_page: 50,
                    page: 2
                })
            );
        });

        it("returns normalized issue output on success", async () => {
            mockClient.get.mockResolvedValueOnce([sampleIssue]);

            const result = await executeListIssues(mockClient, { project_id: "12345678" });

            expect(result.success).toBe(true);
            expect(result.data?.issues).toHaveLength(1);
            expect(result.data?.issues[0]).toMatchObject({
                id: 98765432,
                iid: 42,
                title: "Bug: Application crashes on startup",
                state: "opened",
                labels: ["bug", "critical"]
            });
            expect(result.data?.issues[0].author).toEqual({
                id: 1001,
                username: "jdeveloper",
                name: "Jane Developer"
            });
            expect(result.data?.issues[0].milestone).toEqual({
                id: 5001,
                title: "v2.1.0"
            });
            expect(result.data?.count).toBe(1);
        });

        it("handles issue without author", async () => {
            const issueWithoutAuthor = { ...sampleIssue, author: undefined };
            mockClient.get.mockResolvedValueOnce([issueWithoutAuthor]);

            const result = await executeListIssues(mockClient, { project_id: "12345678" });

            expect(result.success).toBe(true);
            expect(result.data?.issues[0].author).toBeNull();
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 Project Not Found"));

            const result = await executeListIssues(mockClient, { project_id: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("404 Project Not Found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetIssue", () => {
        it("calls client with project ID and issue IID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleIssue);

            await executeGetIssue(mockClient, { project_id: "12345678", issue_iid: 42 });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.get).toHaveBeenCalledWith("/projects/12345678/issues/42");
        });

        it("returns normalized issue output on success", async () => {
            mockClient.get.mockResolvedValueOnce(sampleIssue);

            const result = await executeGetIssue(mockClient, {
                project_id: "12345678",
                issue_iid: 42
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 98765432,
                iid: 42,
                project_id: 12345678,
                title: "Bug: Application crashes on startup",
                state: "opened",
                labels: ["bug", "critical"],
                confidential: false,
                upvotes: 5,
                downvotes: 0,
                user_notes_count: 3,
                merge_requests_count: 1,
                weight: 5
            });
            expect(result.data?.time_stats).toEqual({
                time_estimate: 14400,
                total_time_spent: 7200
            });
            expect(result.data?.references).toEqual({
                short: "#42",
                relative: "#42",
                full: "acme-corp/backend-api#42"
            });
        });

        it("returns error on issue not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 Issue Not Found"));

            const result = await executeGetIssue(mockClient, {
                project_id: "12345678",
                issue_iid: 99999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("404 Issue Not Found");
        });
    });

    describe("executeCreateIssue", () => {
        it("calls client with minimal params", async () => {
            mockClient.post.mockResolvedValueOnce(sampleIssue);

            // Parse through schema to apply defaults
            const params = createIssueSchema.parse({
                project_id: "12345678",
                title: "New issue"
            });
            await executeCreateIssue(mockClient, params);

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.post).toHaveBeenCalledWith(
                "/projects/12345678/issues",
                expect.objectContaining({
                    title: "New issue",
                    confidential: false
                })
            );
        });

        it("calls client with all params", async () => {
            mockClient.post.mockResolvedValueOnce(sampleIssue);

            await executeCreateIssue(mockClient, {
                project_id: "12345678",
                title: "New issue",
                description: "Issue description",
                confidential: true,
                assignee_ids: [1001, 1002],
                milestone_id: 5001,
                labels: "bug,critical",
                due_date: "2024-02-01",
                weight: 5
            });

            expect(mockClient.post).toHaveBeenCalledWith("/projects/12345678/issues", {
                title: "New issue",
                description: "Issue description",
                confidential: true,
                assignee_ids: [1001, 1002],
                milestone_id: 5001,
                labels: "bug,critical",
                due_date: "2024-02-01",
                weight: 5
            });
        });

        it("returns normalized issue output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleIssue);

            const result = await executeCreateIssue(mockClient, {
                project_id: "12345678",
                title: "Bug: Application crashes on startup"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 98765432,
                iid: 42,
                project_id: 12345678,
                title: "Bug: Application crashes on startup",
                state: "opened",
                web_url: "https://gitlab.com/acme-corp/backend-api/-/issues/42"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("403 Forbidden"));

            const result = await executeCreateIssue(mockClient, {
                project_id: "private-org/repo",
                title: "Test issue"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("403 Forbidden");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdateIssue", () => {
        it("calls client with update data", async () => {
            mockClient.put.mockResolvedValueOnce(sampleIssue);

            await executeUpdateIssue(mockClient, {
                project_id: "12345678",
                issue_iid: 42,
                title: "Updated title",
                state_event: "close"
            });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.put).toHaveBeenCalledWith("/projects/12345678/issues/42", {
                title: "Updated title",
                state_event: "close"
            });
        });

        it("returns normalized issue output on success", async () => {
            const updatedIssue = {
                ...sampleIssue,
                title: "Updated title",
                state: "closed",
                closed_at: "2024-01-22T10:00:00.000Z"
            };
            mockClient.put.mockResolvedValueOnce(updatedIssue);

            const result = await executeUpdateIssue(mockClient, {
                project_id: "12345678",
                issue_iid: 42,
                title: "Updated title",
                state_event: "close"
            });

            expect(result.success).toBe(true);
            expect(result.data?.title).toBe("Updated title");
            expect(result.data?.state).toBe("closed");
            expect(result.data?.closed_at).toBe("2024-01-22T10:00:00.000Z");
        });

        it("returns error on issue not found", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("404 Issue Not Found"));

            const result = await executeUpdateIssue(mockClient, {
                project_id: "12345678",
                issue_iid: 99999,
                title: "Updated title"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("404 Issue Not Found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================================
    // MERGE REQUEST OPERATIONS
    // ============================================================

    describe("executeListMergeRequests", () => {
        it("calls client with project ID and default params", async () => {
            mockClient.get.mockResolvedValueOnce([sampleMergeRequest]);

            // Parse through schema to apply defaults
            const params = listMergeRequestsSchema.parse({ project_id: "12345678" });
            await executeListMergeRequests(mockClient, params);

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.get).toHaveBeenCalledWith(
                "/projects/12345678/merge_requests",
                expect.objectContaining({
                    state: "opened",
                    order_by: "created_at",
                    sort: "desc",
                    per_page: 20,
                    page: 1
                })
            );
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce([sampleMergeRequest]);

            await executeListMergeRequests(mockClient, {
                project_id: "12345678",
                state: "merged",
                scope: "assigned_to_me",
                target_branch: "main",
                per_page: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/projects/12345678/merge_requests",
                expect.objectContaining({
                    state: "merged",
                    scope: "assigned_to_me",
                    target_branch: "main",
                    per_page: 50
                })
            );
        });

        it("returns normalized merge request output on success", async () => {
            mockClient.get.mockResolvedValueOnce([sampleMergeRequest]);

            const result = await executeListMergeRequests(mockClient, { project_id: "12345678" });

            expect(result.success).toBe(true);
            expect(result.data?.merge_requests).toHaveLength(1);
            expect(result.data?.merge_requests[0]).toMatchObject({
                id: 87654321,
                iid: 156,
                title: "Add user authentication module",
                state: "opened",
                source_branch: "feature/add-user-authentication",
                target_branch: "main",
                draft: false,
                merge_status: "can_be_merged",
                has_conflicts: false
            });
            expect(result.data?.count).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 Project Not Found"));

            const result = await executeListMergeRequests(mockClient, {
                project_id: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("404 Project Not Found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetMergeRequest", () => {
        it("calls client with project ID and merge request IID", async () => {
            mockClient.get.mockResolvedValueOnce(sampleMergeRequest);

            await executeGetMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 156
            });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.get).toHaveBeenCalledWith("/projects/12345678/merge_requests/156");
        });

        it("returns normalized merge request output on success", async () => {
            mockClient.get.mockResolvedValueOnce(sampleMergeRequest);

            const result = await executeGetMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 156
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 87654321,
                iid: 156,
                project_id: 12345678,
                title: "Add user authentication module",
                state: "opened",
                source_branch: "feature/add-user-authentication",
                target_branch: "main",
                merge_status: "can_be_merged",
                has_conflicts: false,
                blocking_discussions_resolved: true,
                mergeable: true,
                sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
            });
            expect(result.data?.references).toEqual({
                short: "!156",
                relative: "!156",
                full: "acme-corp/backend-api!156"
            });
        });

        it("returns error on merge request not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 Merge Request Not Found"));

            const result = await executeGetMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 99999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("404 Merge Request Not Found");
        });
    });

    describe("executeCreateMergeRequest", () => {
        it("calls client with minimal params", async () => {
            mockClient.post.mockResolvedValueOnce(sampleMergeRequest);

            await executeCreateMergeRequest(mockClient, {
                project_id: "12345678",
                source_branch: "feature/new-feature",
                target_branch: "main",
                title: "New feature"
            });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.post).toHaveBeenCalledWith("/projects/12345678/merge_requests", {
                source_branch: "feature/new-feature",
                target_branch: "main",
                title: "New feature",
                description: undefined,
                assignee_ids: undefined,
                reviewer_ids: undefined,
                milestone_id: undefined,
                labels: undefined,
                squash: undefined,
                remove_source_branch: undefined
            });
        });

        it("prepends Draft: to title when draft is true", async () => {
            mockClient.post.mockResolvedValueOnce({
                ...sampleMergeRequest,
                draft: true,
                title: "Draft: WIP feature"
            });

            await executeCreateMergeRequest(mockClient, {
                project_id: "12345678",
                source_branch: "feature/wip",
                target_branch: "main",
                title: "WIP feature",
                draft: true
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/projects/12345678/merge_requests",
                expect.objectContaining({
                    title: "Draft: WIP feature"
                })
            );
        });

        it("returns normalized merge request output on success", async () => {
            mockClient.post.mockResolvedValueOnce(sampleMergeRequest);

            const result = await executeCreateMergeRequest(mockClient, {
                project_id: "12345678",
                source_branch: "feature/add-user-authentication",
                target_branch: "main",
                title: "Add user authentication module"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 87654321,
                iid: 156,
                project_id: 12345678,
                title: "Add user authentication module",
                state: "opened",
                source_branch: "feature/add-user-authentication",
                target_branch: "main",
                draft: false,
                web_url: "https://gitlab.com/acme-corp/backend-api/-/merge_requests/156"
            });
        });

        it("returns error on branch not found", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Source branch does not exist"));

            const result = await executeCreateMergeRequest(mockClient, {
                project_id: "12345678",
                source_branch: "nonexistent-branch",
                target_branch: "main",
                title: "Test MR"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Source branch does not exist");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeMergeMergeRequest", () => {
        it("calls client with minimal params", async () => {
            const mergedMR = {
                ...sampleMergeRequest,
                state: "merged",
                merged_at: "2024-01-22T10:00:00.000Z",
                merge_commit_sha: "d4e5f6g7h8"
            };
            mockClient.put.mockResolvedValueOnce(mergedMR);

            await executeMergeMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 156
            });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.put).toHaveBeenCalledWith(
                "/projects/12345678/merge_requests/156/merge",
                {}
            );
        });

        it("calls client with all params", async () => {
            const mergedMR = { ...sampleMergeRequest, state: "merged" };
            mockClient.put.mockResolvedValueOnce(mergedMR);

            await executeMergeMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 156,
                merge_commit_message: "Custom merge message",
                squash_commit_message: "Squash message",
                squash: true,
                should_remove_source_branch: true,
                merge_when_pipeline_succeeds: false,
                sha: "a1b2c3d4"
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "/projects/12345678/merge_requests/156/merge",
                {
                    merge_commit_message: "Custom merge message",
                    squash_commit_message: "Squash message",
                    squash: true,
                    should_remove_source_branch: true,
                    merge_when_pipeline_succeeds: false,
                    sha: "a1b2c3d4"
                }
            );
        });

        it("returns normalized merge result on success", async () => {
            const mergedMR: GitLabMergeRequest = {
                ...sampleMergeRequest,
                state: "merged",
                merged_at: "2024-01-22T10:00:00.000Z",
                merge_commit_sha: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3",
                merged_by: sampleUser
            };
            mockClient.put.mockResolvedValueOnce(mergedMR);

            const result = await executeMergeMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 156
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 87654321,
                iid: 156,
                title: "Add user authentication module",
                state: "merged",
                merged: true,
                merge_commit_sha: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3",
                merged_at: "2024-01-22T10:00:00.000Z"
            });
            expect(result.data?.merged_by).toEqual({
                id: 1001,
                username: "jdeveloper",
                name: "Jane Developer"
            });
        });

        it("returns error on merge conflicts", async () => {
            mockClient.put.mockRejectedValueOnce(
                new Error("Merge request cannot be merged: merge conflicts detected")
            );

            const result = await executeMergeMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 160
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe(
                "Merge request cannot be merged: merge conflicts detected"
            );
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on merge request not found", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("404 Merge Request Not Found"));

            const result = await executeMergeMergeRequest(mockClient, {
                project_id: "12345678",
                merge_request_iid: 99999
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("404 Merge Request Not Found");
        });
    });

    // ============================================================
    // PIPELINE OPERATIONS
    // ============================================================

    describe("executeListPipelines", () => {
        it("calls client with project ID and default params", async () => {
            mockClient.get.mockResolvedValueOnce([samplePipeline]);

            // Parse through schema to apply defaults
            const params = listPipelinesSchema.parse({ project_id: "12345678" });
            await executeListPipelines(mockClient, params);

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.get).toHaveBeenCalledWith(
                "/projects/12345678/pipelines",
                expect.objectContaining({
                    order_by: "id",
                    sort: "desc",
                    per_page: 20,
                    page: 1
                })
            );
        });

        it("calls client with custom params", async () => {
            mockClient.get.mockResolvedValueOnce([samplePipeline]);

            await executeListPipelines(mockClient, {
                project_id: "12345678",
                status: "success",
                ref: "main",
                source: "push",
                order_by: "updated_at",
                sort: "asc",
                per_page: 50
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/projects/12345678/pipelines",
                expect.objectContaining({
                    status: "success",
                    ref: "main",
                    source: "push",
                    order_by: "updated_at",
                    sort: "asc",
                    per_page: 50
                })
            );
        });

        it("returns normalized pipeline output on success", async () => {
            mockClient.get.mockResolvedValueOnce([samplePipeline]);

            const result = await executeListPipelines(mockClient, { project_id: "12345678" });

            expect(result.success).toBe(true);
            expect(result.data?.pipelines).toHaveLength(1);
            expect(result.data?.pipelines[0]).toMatchObject({
                id: 456789012,
                iid: 1542,
                project_id: 12345678,
                status: "success",
                source: "push",
                ref: "main",
                sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
                duration: 570,
                coverage: "87.5",
                web_url: "https://gitlab.com/acme-corp/backend-api/-/pipelines/456789012"
            });
            expect(result.data?.count).toBe(1);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 Project Not Found"));

            const result = await executeListPipelines(mockClient, { project_id: "nonexistent" });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("404 Project Not Found");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeTriggerPipeline", () => {
        it("calls client with ref", async () => {
            const createdPipeline = { ...samplePipeline, status: "created", source: "api" };
            mockClient.post.mockResolvedValueOnce(createdPipeline);

            await executeTriggerPipeline(mockClient, {
                project_id: "12345678",
                ref: "main"
            });

            expect(mockClient.encodeProjectPath).toHaveBeenCalledWith("12345678");
            expect(mockClient.post).toHaveBeenCalledWith("/projects/12345678/pipeline", {
                ref: "main"
            });
        });

        it("calls client with variables", async () => {
            const createdPipeline = { ...samplePipeline, status: "created", source: "api" };
            mockClient.post.mockResolvedValueOnce(createdPipeline);

            await executeTriggerPipeline(mockClient, {
                project_id: "12345678",
                ref: "main",
                variables: [
                    { key: "DEPLOY_ENV", value: "staging" },
                    { key: "DEBUG", value: "true", variable_type: "env_var" }
                ]
            });

            expect(mockClient.post).toHaveBeenCalledWith("/projects/12345678/pipeline", {
                ref: "main",
                variables: [
                    { key: "DEPLOY_ENV", value: "staging" },
                    { key: "DEBUG", value: "true", variable_type: "env_var" }
                ]
            });
        });

        it("returns normalized pipeline output on success", async () => {
            const createdPipeline: GitLabPipeline = {
                ...samplePipeline,
                id: 456789015,
                iid: 1545,
                status: "created",
                source: "api"
            };
            mockClient.post.mockResolvedValueOnce(createdPipeline);

            const result = await executeTriggerPipeline(mockClient, {
                project_id: "12345678",
                ref: "main"
            });

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                id: 456789015,
                iid: 1545,
                project_id: 12345678,
                status: "created",
                source: "api",
                ref: "main",
                sha: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
            });
            expect(result.data?.user).toEqual({
                id: 1001,
                username: "jdeveloper",
                name: "Jane Developer"
            });
        });

        it("handles pipeline without user", async () => {
            const pipelineWithoutUser = { ...samplePipeline, user: undefined };
            mockClient.post.mockResolvedValueOnce(pipelineWithoutUser);

            const result = await executeTriggerPipeline(mockClient, {
                project_id: "12345678",
                ref: "main"
            });

            expect(result.success).toBe(true);
            expect(result.data?.user).toBeNull();
        });

        it("returns error on ref not found", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Reference not found"));

            const result = await executeTriggerPipeline(mockClient, {
                project_id: "12345678",
                ref: "nonexistent-branch"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Reference not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("returns error on no CI config", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("No CI/CD configuration found"));

            const result = await executeTriggerPipeline(mockClient, {
                project_id: "12345678",
                ref: "main"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("No CI/CD configuration found");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // ============================================================
    // SCHEMA VALIDATION TESTS
    // ============================================================

    describe("schema validation", () => {
        describe("listProjectsSchema", () => {
            it("validates empty input (all optional with defaults)", () => {
                const result = listProjectsSchema.safeParse({});
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.data.membership).toBe(true);
                    expect(result.data.order_by).toBe("last_activity_at");
                    expect(result.data.sort).toBe("desc");
                    expect(result.data.per_page).toBe(20);
                    expect(result.data.page).toBe(1);
                }
            });

            it("validates visibility enum", () => {
                const result = listProjectsSchema.safeParse({ visibility: "private" });
                expect(result.success).toBe(true);

                const invalid = listProjectsSchema.safeParse({ visibility: "invalid" });
                expect(invalid.success).toBe(false);
            });

            it("validates per_page range", () => {
                const tooHigh = listProjectsSchema.safeParse({ per_page: 200 });
                expect(tooHigh.success).toBe(false);

                const tooLow = listProjectsSchema.safeParse({ per_page: 0 });
                expect(tooLow.success).toBe(false);

                const valid = listProjectsSchema.safeParse({ per_page: 50 });
                expect(valid.success).toBe(true);
            });
        });

        describe("getProjectSchema", () => {
            it("requires project_id", () => {
                const result = getProjectSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("validates project_id", () => {
                const result = getProjectSchema.safeParse({ project_id: "12345678" });
                expect(result.success).toBe(true);
            });
        });

        describe("createProjectSchema", () => {
            it("requires name", () => {
                const result = createProjectSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("validates minimal input", () => {
                const result = createProjectSchema.safeParse({ name: "test-project" });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = createProjectSchema.parse({ name: "test-project" });
                expect(result.visibility).toBe("private");
                expect(result.initialize_with_readme).toBe(false);
                expect(result.issues_enabled).toBe(true);
                expect(result.merge_requests_enabled).toBe(true);
                expect(result.wiki_enabled).toBe(true);
                expect(result.jobs_enabled).toBe(true);
            });

            it("rejects empty name", () => {
                const result = createProjectSchema.safeParse({ name: "" });
                expect(result.success).toBe(false);
            });
        });

        describe("updateProjectSchema", () => {
            it("requires project_id", () => {
                const result = updateProjectSchema.safeParse({ name: "new-name" });
                expect(result.success).toBe(false);
            });

            it("validates with project_id only", () => {
                const result = updateProjectSchema.safeParse({ project_id: "12345678" });
                expect(result.success).toBe(true);
            });
        });

        describe("deleteProjectSchema", () => {
            it("requires project_id", () => {
                const result = deleteProjectSchema.safeParse({});
                expect(result.success).toBe(false);
            });
        });

        describe("listIssuesSchema", () => {
            it("requires project_id", () => {
                const result = listIssuesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("validates state enum", () => {
                const valid = listIssuesSchema.safeParse({ project_id: "123", state: "opened" });
                expect(valid.success).toBe(true);

                const invalid = listIssuesSchema.safeParse({ project_id: "123", state: "invalid" });
                expect(invalid.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listIssuesSchema.parse({ project_id: "123" });
                expect(result.state).toBe("opened");
                expect(result.order_by).toBe("created_at");
                expect(result.sort).toBe("desc");
                expect(result.per_page).toBe(20);
                expect(result.page).toBe(1);
            });
        });

        describe("getIssueSchema", () => {
            it("requires project_id and issue_iid", () => {
                const result = getIssueSchema.safeParse({});
                expect(result.success).toBe(false);

                const withProjectOnly = getIssueSchema.safeParse({ project_id: "123" });
                expect(withProjectOnly.success).toBe(false);

                const valid = getIssueSchema.safeParse({ project_id: "123", issue_iid: 42 });
                expect(valid.success).toBe(true);
            });
        });

        describe("createIssueSchema", () => {
            it("requires project_id and title", () => {
                const result = createIssueSchema.safeParse({});
                expect(result.success).toBe(false);

                const withProjectOnly = createIssueSchema.safeParse({ project_id: "123" });
                expect(withProjectOnly.success).toBe(false);

                const valid = createIssueSchema.safeParse({
                    project_id: "123",
                    title: "Test issue"
                });
                expect(valid.success).toBe(true);
            });

            it("rejects empty title", () => {
                const result = createIssueSchema.safeParse({ project_id: "123", title: "" });
                expect(result.success).toBe(false);
            });

            it("validates weight min value", () => {
                const negative = createIssueSchema.safeParse({
                    project_id: "123",
                    title: "Test",
                    weight: -1
                });
                expect(negative.success).toBe(false);

                const valid = createIssueSchema.safeParse({
                    project_id: "123",
                    title: "Test",
                    weight: 0
                });
                expect(valid.success).toBe(true);
            });
        });

        describe("updateIssueSchema", () => {
            it("requires project_id and issue_iid", () => {
                const result = updateIssueSchema.safeParse({});
                expect(result.success).toBe(false);

                const valid = updateIssueSchema.safeParse({ project_id: "123", issue_iid: 42 });
                expect(valid.success).toBe(true);
            });

            it("validates state_event enum", () => {
                const valid = updateIssueSchema.safeParse({
                    project_id: "123",
                    issue_iid: 42,
                    state_event: "close"
                });
                expect(valid.success).toBe(true);

                const invalid = updateIssueSchema.safeParse({
                    project_id: "123",
                    issue_iid: 42,
                    state_event: "invalid"
                });
                expect(invalid.success).toBe(false);
            });
        });

        describe("listMergeRequestsSchema", () => {
            it("requires project_id", () => {
                const result = listMergeRequestsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("validates state enum", () => {
                const valid = listMergeRequestsSchema.safeParse({
                    project_id: "123",
                    state: "merged"
                });
                expect(valid.success).toBe(true);

                const invalid = listMergeRequestsSchema.safeParse({
                    project_id: "123",
                    state: "invalid"
                });
                expect(invalid.success).toBe(false);
            });
        });

        describe("getMergeRequestSchema", () => {
            it("requires project_id and merge_request_iid", () => {
                const result = getMergeRequestSchema.safeParse({});
                expect(result.success).toBe(false);

                const valid = getMergeRequestSchema.safeParse({
                    project_id: "123",
                    merge_request_iid: 156
                });
                expect(valid.success).toBe(true);
            });
        });

        describe("createMergeRequestSchema", () => {
            it("requires project_id, source_branch, target_branch, and title", () => {
                const result = createMergeRequestSchema.safeParse({});
                expect(result.success).toBe(false);

                const valid = createMergeRequestSchema.safeParse({
                    project_id: "123",
                    source_branch: "feature/test",
                    target_branch: "main",
                    title: "Test MR"
                });
                expect(valid.success).toBe(true);
            });

            it("rejects empty branch names", () => {
                const emptySrc = createMergeRequestSchema.safeParse({
                    project_id: "123",
                    source_branch: "",
                    target_branch: "main",
                    title: "Test"
                });
                expect(emptySrc.success).toBe(false);
            });
        });

        describe("mergeMergeRequestSchema", () => {
            it("requires project_id and merge_request_iid", () => {
                const result = mergeMergeRequestSchema.safeParse({});
                expect(result.success).toBe(false);

                const valid = mergeMergeRequestSchema.safeParse({
                    project_id: "123",
                    merge_request_iid: 156
                });
                expect(valid.success).toBe(true);
            });

            it("validates all optional params", () => {
                const result = mergeMergeRequestSchema.safeParse({
                    project_id: "123",
                    merge_request_iid: 156,
                    merge_commit_message: "Custom message",
                    squash: true,
                    should_remove_source_branch: true,
                    merge_when_pipeline_succeeds: false,
                    sha: "a1b2c3d4"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listPipelinesSchema", () => {
            it("requires project_id", () => {
                const result = listPipelinesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("validates status enum", () => {
                const valid = listPipelinesSchema.safeParse({
                    project_id: "123",
                    status: "success"
                });
                expect(valid.success).toBe(true);

                const invalid = listPipelinesSchema.safeParse({
                    project_id: "123",
                    status: "invalid"
                });
                expect(invalid.success).toBe(false);
            });

            it("validates source enum", () => {
                const valid = listPipelinesSchema.safeParse({ project_id: "123", source: "push" });
                expect(valid.success).toBe(true);

                const invalid = listPipelinesSchema.safeParse({
                    project_id: "123",
                    source: "invalid"
                });
                expect(invalid.success).toBe(false);
            });
        });

        describe("triggerPipelineSchema", () => {
            it("requires project_id and ref", () => {
                const result = triggerPipelineSchema.safeParse({});
                expect(result.success).toBe(false);

                const withProjectOnly = triggerPipelineSchema.safeParse({ project_id: "123" });
                expect(withProjectOnly.success).toBe(false);

                const valid = triggerPipelineSchema.safeParse({ project_id: "123", ref: "main" });
                expect(valid.success).toBe(true);
            });

            it("rejects empty ref", () => {
                const result = triggerPipelineSchema.safeParse({ project_id: "123", ref: "" });
                expect(result.success).toBe(false);
            });

            it("validates variables array", () => {
                const result = triggerPipelineSchema.safeParse({
                    project_id: "123",
                    ref: "main",
                    variables: [
                        { key: "VAR1", value: "value1" },
                        { key: "VAR2", value: "value2", variable_type: "file" }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid variable_type", () => {
                const result = triggerPipelineSchema.safeParse({
                    project_id: "123",
                    ref: "main",
                    variables: [{ key: "VAR1", value: "value1", variable_type: "invalid" }]
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
