/**
 * Bitbucket Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

// Repository operations

// Pull request operations

// Issue operations
import { executeCreateIssue, createIssueSchema } from "../operations/issues/createIssue";
import { executeListIssues, listIssuesSchema } from "../operations/issues/listIssues";

// Pipeline operations
import { executeGetPipeline, getPipelineSchema } from "../operations/pipelines/getPipeline";
import { executeListPipelines, listPipelinesSchema } from "../operations/pipelines/listPipelines";
import {
    executeTriggerPipeline,
    triggerPipelineSchema
} from "../operations/pipelines/triggerPipeline";
import {
    executeCreatePullRequest,
    createPullRequestSchema
} from "../operations/pull-requests/createPullRequest";
import {
    executeGetPullRequest,
    getPullRequestSchema
} from "../operations/pull-requests/getPullRequest";
import {
    executeListPullRequests,
    listPullRequestsSchema
} from "../operations/pull-requests/listPullRequests";
import {
    executeMergePullRequest,
    mergePullRequestSchema
} from "../operations/pull-requests/mergePullRequest";
import {
    executeUpdatePullRequest,
    updatePullRequestSchema
} from "../operations/pull-requests/updatePullRequest";
import {
    executeCreateRepository,
    createRepositorySchema
} from "../operations/repositories/createRepository";
import {
    executeDeleteRepository,
    deleteRepositorySchema
} from "../operations/repositories/deleteRepository";
import {
    executeGetRepository,
    getRepositorySchema
} from "../operations/repositories/getRepository";
import {
    executeListRepositories,
    listRepositoriesSchema
} from "../operations/repositories/listRepositories";

import type { BitbucketClient } from "../client/BitbucketClient";
import type {
    BitbucketRepository,
    BitbucketPullRequest,
    BitbucketIssue,
    BitbucketPipeline,
    BitbucketPaginatedResponse
} from "../operations/types";

// Mock BitbucketClient factory
function createMockBitbucketClient(): jest.Mocked<BitbucketClient> {
    return {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn(),
        getAllPages: jest.fn()
    } as unknown as jest.Mocked<BitbucketClient>;
}

// Test fixtures
const mockUser = {
    type: "user",
    uuid: "{a1b2c3d4-e5f6-7890-abcd-ef1234567890}",
    username: "testuser",
    display_name: "Test User",
    nickname: "testuser",
    account_id: "123456",
    links: {
        self: { href: "https://api.bitbucket.org/2.0/users/testuser" },
        html: { href: "https://bitbucket.org/testuser" },
        avatar: { href: "https://bitbucket.org/account/testuser/avatar" }
    }
};

const mockWorkspace = {
    type: "workspace",
    uuid: "{ws-1111-2222-3333-444455556666}",
    name: "ACME Corporation",
    slug: "acme-corp",
    links: {
        self: { href: "https://api.bitbucket.org/2.0/workspaces/acme-corp" },
        html: { href: "https://bitbucket.org/acme-corp" }
    }
};

const mockRepository: BitbucketRepository = {
    type: "repository",
    uuid: "{repo-1111-2222-3333-444455556666}",
    name: "backend-api",
    full_name: "acme-corp/backend-api",
    description: "Core REST API service",
    is_private: true,
    fork_policy: "no_public_forks",
    language: "typescript",
    created_on: "2023-06-15T10:00:00.000000+00:00",
    updated_on: "2024-01-20T08:30:00.000000+00:00",
    size: 45678912,
    has_issues: true,
    has_wiki: true,
    mainbranch: { name: "main", type: "branch" },
    owner: mockUser,
    workspace: mockWorkspace,
    project: {
        type: "project",
        uuid: "{proj-1111-2222-3333-444455556666}",
        key: "BACKEND",
        name: "Backend Services",
        links: {
            self: { href: "https://api.bitbucket.org/2.0/workspaces/acme-corp/projects/BACKEND" }
        }
    },
    links: {
        self: { href: "https://api.bitbucket.org/2.0/repositories/acme-corp/backend-api" },
        html: { href: "https://bitbucket.org/acme-corp/backend-api" }
    },
    scm: "git"
};

const mockPullRequest: BitbucketPullRequest = {
    type: "pullrequest",
    id: 42,
    title: "feat: Add user authentication",
    description: "Implements OAuth2 authentication flow",
    state: "OPEN",
    created_on: "2024-01-15T09:30:00.000000+00:00",
    updated_on: "2024-01-18T14:22:00.000000+00:00",
    source: {
        branch: { name: "feature/oauth2-auth" },
        commit: { hash: "f6a7890123456789012345678901234567890123" }
    },
    destination: {
        branch: { name: "main" },
        commit: { hash: "a1b2c3d4e5f6789012345678901234567890abcd" }
    },
    author: mockUser,
    close_source_branch: true,
    closed_by: null,
    merge_commit: null,
    comment_count: 8,
    task_count: 2,
    reviewers: [
        {
            type: "user",
            uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
            display_name: "Bob Martinez",
            links: { self: { href: "" } }
        }
    ],
    participants: [
        {
            user: {
                type: "user",
                uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
                display_name: "Bob Martinez",
                links: { self: { href: "" } }
            },
            role: "REVIEWER",
            approved: true,
            state: "approved",
            participated_on: "2024-01-17T10:00:00.000000+00:00"
        }
    ],
    links: {
        self: {
            href: "https://api.bitbucket.org/2.0/repositories/acme-corp/backend-api/pullrequests/42"
        },
        html: { href: "https://bitbucket.org/acme-corp/backend-api/pull-requests/42" }
    }
};

const mockIssue: BitbucketIssue = {
    type: "issue",
    id: 156,
    title: "API returns 500 error on malformed JSON",
    content: {
        raw: "When sending malformed JSON, server returns 500 instead of 400",
        markup: "markdown",
        html: "<p>When sending malformed JSON, server returns 500 instead of 400</p>"
    },
    reporter: mockUser,
    assignee: null,
    state: "new",
    kind: "bug",
    priority: "critical",
    component: { name: "api" },
    milestone: { name: "v2.1.0" },
    version: { name: "2.0.5" },
    created_on: "2024-01-18T10:30:00.000000+00:00",
    updated_on: "2024-01-18T15:45:00.000000+00:00",
    edited_on: null,
    votes: 5,
    links: {
        self: {
            href: "https://api.bitbucket.org/2.0/repositories/acme-corp/backend-api/issues/156"
        },
        html: { href: "https://bitbucket.org/acme-corp/backend-api/issues/156" }
    }
};

const mockPipeline: BitbucketPipeline = {
    type: "pipeline",
    uuid: "{pipe-1111-2222-3333-444455556666}",
    build_number: 245,
    creator: mockUser,
    repository: mockRepository,
    target: {
        type: "pipeline_ref_target",
        ref_type: "branch",
        ref_name: "main",
        commit: {
            type: "commit",
            hash: "a1b2c3d4e5f6789012345678901234567890abcd"
        }
    },
    trigger: {
        type: "push",
        name: "Push to main"
    },
    state: {
        type: "pipeline_state_completed",
        name: "COMPLETED",
        result: {
            type: "pipeline_state_completed_successful",
            name: "SUCCESSFUL"
        }
    },
    created_on: "2024-01-20T08:00:00.000000+00:00",
    completed_on: "2024-01-20T08:12:34.000000+00:00",
    run_number: 245,
    duration_in_seconds: 754,
    build_seconds_used: 512,
    first_successful: false,
    expired: false,
    links: {
        self: {
            href: "https://api.bitbucket.org/2.0/repositories/acme-corp/backend-api/pipelines/{pipe-1111-2222-3333-444455556666}"
        },
        html: { href: "https://bitbucket.org/acme-corp/backend-api/pipelines/results/245" }
    }
};

describe("Bitbucket Operation Executors", () => {
    let mockClient: jest.Mocked<BitbucketClient>;

    beforeEach(() => {
        mockClient = createMockBitbucketClient();
    });

    // =========================================================================
    // REPOSITORY OPERATIONS
    // =========================================================================

    describe("executeListRepositories", () => {
        it("calls client with correct params", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketRepository> = {
                values: [mockRepository],
                pagelen: 20,
                page: 1
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeListRepositories(mockClient, {
                workspace: "acme-corp",
                pagelen: 20,
                page: 1
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repositories/acme-corp", {
                pagelen: 20,
                page: 1
            });
        });

        it("returns normalized repository output", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketRepository> = {
                values: [mockRepository],
                pagelen: 20,
                page: 1
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListRepositories(mockClient, {
                workspace: "acme-corp"
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("repositories");
            const repos = (result.data as { repositories: unknown[] }).repositories;
            expect(repos).toHaveLength(1);
            expect(repos[0]).toEqual({
                uuid: mockRepository.uuid,
                name: mockRepository.name,
                full_name: mockRepository.full_name,
                description: mockRepository.description,
                is_private: mockRepository.is_private,
                language: mockRepository.language,
                created_on: mockRepository.created_on,
                updated_on: mockRepository.updated_on,
                size: mockRepository.size,
                has_issues: mockRepository.has_issues,
                has_wiki: mockRepository.has_wiki,
                mainbranch: mockRepository.mainbranch?.name,
                scm: mockRepository.scm,
                html_url: mockRepository.links.html?.href,
                workspace: {
                    slug: mockRepository.workspace.slug,
                    name: mockRepository.workspace.name
                }
            });
        });

        it("includes pagination info with has_more", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketRepository> = {
                values: [mockRepository],
                pagelen: 20,
                page: 1,
                next: "https://api.bitbucket.org/2.0/repositories/acme-corp?page=2"
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListRepositories(mockClient, {
                workspace: "acme-corp"
            });

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("has_more", true);
            expect(result.data).toHaveProperty("count", 1);
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Network error"));

            const result = await executeListRepositories(mockClient, {
                workspace: "acme-corp"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Network error");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.get.mockRejectedValueOnce("string error");

            const result = await executeListRepositories(mockClient, {
                workspace: "acme-corp"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list repositories");
        });
    });

    describe("executeGetRepository", () => {
        it("calls client with correct endpoint", async () => {
            mockClient.get.mockResolvedValueOnce(mockRepository);

            await executeGetRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api"
            });

            expect(mockClient.get).toHaveBeenCalledWith("/repositories/acme-corp/backend-api");
        });

        it("returns normalized repository output", async () => {
            mockClient.get.mockResolvedValueOnce(mockRepository);

            const result = await executeGetRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api"
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.uuid).toBe(mockRepository.uuid);
            expect(data.name).toBe(mockRepository.name);
            expect(data.full_name).toBe(mockRepository.full_name);
            expect(data.is_private).toBe(true);
            expect(data.fork_policy).toBe("no_public_forks");
            expect(data.mainbranch).toBe("main");
            expect(data.project).toEqual({
                uuid: "{proj-1111-2222-3333-444455556666}",
                key: "BACKEND",
                name: "Backend Services"
            });
        });

        it("returns null project when repository has no project", async () => {
            const repoWithoutProject = { ...mockRepository, project: undefined };
            mockClient.get.mockResolvedValueOnce(repoWithoutProject);

            const result = await executeGetRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api"
            });

            expect(result.success).toBe(true);
            expect((result.data as Record<string, unknown>).project).toBeNull();
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Not found"));

            const result = await executeGetRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Not found");
        });
    });

    describe("executeCreateRepository", () => {
        it("calls client with correct params for basic creation", async () => {
            mockClient.post.mockResolvedValueOnce(mockRepository);

            await executeCreateRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "new-repo"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/new-repo",
                expect.objectContaining({
                    scm: "git"
                })
            );
        });

        it("calls client with project key when specified", async () => {
            mockClient.post.mockResolvedValueOnce(mockRepository);

            await executeCreateRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "new-repo",
                project_key: "BACKEND",
                description: "A new repository"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/new-repo",
                expect.objectContaining({
                    scm: "git",
                    description: "A new repository",
                    project: { key: "BACKEND" }
                })
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockRepository);

            const result = await executeCreateRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "new-repo"
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.uuid).toBe(mockRepository.uuid);
            expect(data.full_name).toBe(mockRepository.full_name);
            expect(data.html_url).toBe(mockRepository.links.html?.href);
        });

        it("returns error on creation failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Repository already exists"));

            const result = await executeCreateRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "existing-repo"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Repository already exists");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeDeleteRepository", () => {
        it("calls client with correct endpoint", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            await executeDeleteRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "old-repo"
            });

            expect(mockClient.delete).toHaveBeenCalledWith("/repositories/acme-corp/old-repo");
        });

        it("returns success with deletion info", async () => {
            mockClient.delete.mockResolvedValueOnce(undefined);

            const result = await executeDeleteRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "old-repo"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                deleted: true,
                workspace: "acme-corp",
                repo_slug: "old-repo"
            });
        });

        it("returns error on deletion failure", async () => {
            mockClient.delete.mockRejectedValueOnce(new Error("Permission denied"));

            const result = await executeDeleteRepository(mockClient, {
                workspace: "acme-corp",
                repo_slug: "protected-repo"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Permission denied");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // =========================================================================
    // PULL REQUEST OPERATIONS
    // =========================================================================

    describe("executeListPullRequests", () => {
        it("calls client with correct params", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketPullRequest> = {
                values: [mockPullRequest],
                pagelen: 20
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeListPullRequests(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                state: "OPEN"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests",
                expect.objectContaining({ state: "OPEN" })
            );
        });

        it("returns normalized pull request output", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketPullRequest> = {
                values: [mockPullRequest],
                pagelen: 20
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListPullRequests(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api"
            });

            expect(result.success).toBe(true);
            const prs = (result.data as { pull_requests: unknown[] }).pull_requests;
            expect(prs).toHaveLength(1);
            expect(prs[0]).toEqual({
                id: mockPullRequest.id,
                title: mockPullRequest.title,
                description: mockPullRequest.description,
                state: mockPullRequest.state,
                source_branch: mockPullRequest.source.branch.name,
                destination_branch: mockPullRequest.destination.branch.name,
                author: {
                    uuid: mockUser.uuid,
                    display_name: mockUser.display_name,
                    username: mockUser.username
                },
                created_on: mockPullRequest.created_on,
                updated_on: mockPullRequest.updated_on,
                close_source_branch: mockPullRequest.close_source_branch,
                comment_count: mockPullRequest.comment_count,
                task_count: mockPullRequest.task_count,
                reviewers: [
                    {
                        uuid: "{b2c3d4e5-f6a7-8901-bcde-f23456789012}",
                        display_name: "Bob Martinez"
                    }
                ],
                html_url: mockPullRequest.links.html?.href
            });
        });

        it("returns error on client failure", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Repository not found"));

            const result = await executeListPullRequests(mockClient, {
                workspace: "acme-corp",
                repo_slug: "nonexistent"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeGetPullRequest", () => {
        it("calls client with correct endpoint", async () => {
            mockClient.get.mockResolvedValueOnce(mockPullRequest);

            await executeGetPullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests/42"
            );
        });

        it("returns full pull request details with participants", async () => {
            mockClient.get.mockResolvedValueOnce(mockPullRequest);

            const result = await executeGetPullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.id).toBe(42);
            expect(data.source).toEqual({
                branch: "feature/oauth2-auth",
                commit: "f6a7890123456789012345678901234567890123"
            });
            expect(data.destination).toEqual({
                branch: "main",
                commit: "a1b2c3d4e5f6789012345678901234567890abcd"
            });
            expect(data.participants).toHaveLength(1);
            // merge_commit is undefined when there's no merge commit hash
            expect(data.merge_commit).toBeUndefined();
            expect(data.closed_by).toBeNull();
        });

        it("returns error when pull request not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Pull request not found"));

            const result = await executeGetPullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 99999
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Pull request not found");
        });
    });

    describe("executeCreatePullRequest", () => {
        it("calls client with correct params for basic PR creation", async () => {
            mockClient.post.mockResolvedValueOnce(mockPullRequest);

            await executeCreatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "feat: Add new feature",
                source_branch: "feature/new-feature",
                destination_branch: "main"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests",
                expect.objectContaining({
                    title: "feat: Add new feature",
                    source: { branch: { name: "feature/new-feature" } },
                    destination: { branch: { name: "main" } }
                })
            );
        });

        it("includes reviewers when specified", async () => {
            mockClient.post.mockResolvedValueOnce(mockPullRequest);

            await executeCreatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "feat: Add feature",
                source_branch: "feature/test",
                destination_branch: "main",
                reviewers: ["{uuid-1}", "{uuid-2}"]
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests",
                expect.objectContaining({
                    reviewers: [{ uuid: "{uuid-1}" }, { uuid: "{uuid-2}" }]
                })
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockPullRequest);

            const result = await executeCreatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "feat: Add feature",
                source_branch: "feature/test",
                destination_branch: "main"
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.id).toBe(42);
            expect(data.state).toBe("OPEN");
            expect(data.html_url).toBe(mockPullRequest.links.html?.href);
        });

        it("returns error on creation failure", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Source branch not found"));

            const result = await executeCreatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "feat: Add feature",
                source_branch: "nonexistent",
                destination_branch: "main"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeUpdatePullRequest", () => {
        it("calls client with correct params for title update", async () => {
            const updatedPR = { ...mockPullRequest, title: "Updated title" };
            mockClient.put.mockResolvedValueOnce(updatedPR);

            await executeUpdatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42,
                title: "Updated title"
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests/42",
                { title: "Updated title" }
            );
        });

        it("includes destination branch when specified", async () => {
            mockClient.put.mockResolvedValueOnce(mockPullRequest);

            await executeUpdatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42,
                destination_branch: "develop"
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests/42",
                { destination: { branch: { name: "develop" } } }
            );
        });

        it("includes reviewers when specified", async () => {
            mockClient.put.mockResolvedValueOnce(mockPullRequest);

            await executeUpdatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42,
                reviewers: ["{reviewer-uuid}"]
            });

            expect(mockClient.put).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests/42",
                { reviewers: [{ uuid: "{reviewer-uuid}" }] }
            );
        });

        it("returns error when PR not found", async () => {
            mockClient.put.mockRejectedValueOnce(new Error("Pull request not found"));

            const result = await executeUpdatePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 99999,
                title: "Updated"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeMergePullRequest", () => {
        it("calls client with correct merge params", async () => {
            const mergedPR = {
                ...mockPullRequest,
                state: "MERGED",
                merge_commit: { hash: "abc123" }
            };
            mockClient.post.mockResolvedValueOnce(mergedPR);

            await executeMergePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42,
                merge_strategy: "squash",
                message: "Squash and merge"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pullrequests/42/merge",
                {
                    merge_strategy: "squash",
                    message: "Squash and merge"
                }
            );
        });

        it("returns merged status with merge commit", async () => {
            const mergedPR: BitbucketPullRequest = {
                ...mockPullRequest,
                state: "MERGED",
                merge_commit: { hash: "merged123456789" },
                closed_by: mockUser
            };
            mockClient.post.mockResolvedValueOnce(mergedPR);

            const result = await executeMergePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.merged).toBe(true);
            expect(data.state).toBe("MERGED");
            expect(data.merge_commit).toBe("merged123456789");
            expect(data.closed_by).toEqual({
                uuid: mockUser.uuid,
                display_name: mockUser.display_name
            });
        });

        it("returns error on merge conflict", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("Merge conflict"));

            const result = await executeMergePullRequest(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pull_request_id: 42
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Merge conflict");
            expect(result.error?.retryable).toBe(false);
        });
    });

    // =========================================================================
    // ISSUE OPERATIONS
    // =========================================================================

    describe("executeListIssues", () => {
        it("calls client with correct params", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketIssue> = {
                values: [mockIssue],
                pagelen: 20
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeListIssues(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                state: "new",
                priority: "critical"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/issues",
                expect.objectContaining({ state: "new", priority: "critical" })
            );
        });

        it("returns normalized issue output", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketIssue> = {
                values: [mockIssue],
                pagelen: 20
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListIssues(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api"
            });

            expect(result.success).toBe(true);
            const issues = (result.data as { issues: unknown[] }).issues;
            expect(issues).toHaveLength(1);
            expect(issues[0]).toEqual({
                id: mockIssue.id,
                title: mockIssue.title,
                content: mockIssue.content.raw,
                state: mockIssue.state,
                kind: mockIssue.kind,
                priority: mockIssue.priority,
                reporter: {
                    uuid: mockUser.uuid,
                    display_name: mockUser.display_name
                },
                assignee: null,
                component: mockIssue.component?.name,
                milestone: mockIssue.milestone?.name,
                version: mockIssue.version?.name,
                created_on: mockIssue.created_on,
                updated_on: mockIssue.updated_on,
                votes: mockIssue.votes,
                html_url: mockIssue.links.html?.href
            });
        });

        it("returns validation error when issue tracker not enabled", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 not found"));

            const result = await executeListIssues(mockClient, {
                workspace: "acme-corp",
                repo_slug: "no-issues-repo"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("Issue tracker is not enabled");
            expect(result.error?.retryable).toBe(false);
        });
    });

    describe("executeCreateIssue", () => {
        it("calls client with correct params for basic issue", async () => {
            mockClient.post.mockResolvedValueOnce(mockIssue);

            await executeCreateIssue(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "New bug report",
                kind: "bug",
                priority: "major"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/issues",
                {
                    title: "New bug report",
                    kind: "bug",
                    priority: "major"
                }
            );
        });

        it("includes content as markdown object", async () => {
            mockClient.post.mockResolvedValueOnce(mockIssue);

            await executeCreateIssue(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "New issue",
                content: "Issue description"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/issues",
                expect.objectContaining({
                    content: { raw: "Issue description", markup: "markdown" }
                })
            );
        });

        it("includes assignee, component, milestone, version when specified", async () => {
            mockClient.post.mockResolvedValueOnce(mockIssue);

            await executeCreateIssue(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "New issue",
                assignee_uuid: "{user-uuid}",
                component: "api",
                milestone: "v2.0",
                version: "1.5.0"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/issues",
                expect.objectContaining({
                    assignee: { uuid: "{user-uuid}" },
                    component: { name: "api" },
                    milestone: { name: "v2.0" },
                    version: { name: "1.5.0" }
                })
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.post.mockResolvedValueOnce(mockIssue);

            const result = await executeCreateIssue(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                title: "New issue"
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.id).toBe(mockIssue.id);
            expect(data.state).toBe("new");
            expect(data.kind).toBe("bug");
            expect(data.html_url).toBe(mockIssue.links.html?.href);
        });

        it("returns validation error when issue tracker not enabled", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("404 not found"));

            const result = await executeCreateIssue(mockClient, {
                workspace: "acme-corp",
                repo_slug: "no-issues-repo",
                title: "Test"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("Issue tracker is not enabled");
        });
    });

    // =========================================================================
    // PIPELINE OPERATIONS
    // =========================================================================

    describe("executeListPipelines", () => {
        it("calls client with correct params", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketPipeline> = {
                values: [mockPipeline],
                pagelen: 20
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            await executeListPipelines(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                sort: "-created_on"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pipelines",
                expect.objectContaining({ sort: "-created_on" })
            );
        });

        it("returns normalized pipeline output", async () => {
            const mockResponse: BitbucketPaginatedResponse<BitbucketPipeline> = {
                values: [mockPipeline],
                pagelen: 20
            };
            mockClient.get.mockResolvedValueOnce(mockResponse);

            const result = await executeListPipelines(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api"
            });

            expect(result.success).toBe(true);
            const pipelines = (result.data as { pipelines: unknown[] }).pipelines;
            expect(pipelines).toHaveLength(1);
            expect(pipelines[0]).toEqual({
                uuid: mockPipeline.uuid,
                build_number: mockPipeline.build_number,
                state: {
                    name: mockPipeline.state.name,
                    result: mockPipeline.state.result?.name
                },
                target: {
                    type: mockPipeline.target.type,
                    ref_type: mockPipeline.target.ref_type,
                    ref_name: mockPipeline.target.ref_name,
                    commit: mockPipeline.target.commit?.hash
                },
                trigger: {
                    type: mockPipeline.trigger.type,
                    name: mockPipeline.trigger.name
                },
                creator: {
                    uuid: mockUser.uuid,
                    display_name: mockUser.display_name
                },
                created_on: mockPipeline.created_on,
                completed_on: mockPipeline.completed_on,
                duration_in_seconds: mockPipeline.duration_in_seconds,
                build_seconds_used: mockPipeline.build_seconds_used,
                html_url: mockPipeline.links.html?.href
            });
        });

        it("returns validation error when pipelines not enabled", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("404 not found"));

            const result = await executeListPipelines(mockClient, {
                workspace: "acme-corp",
                repo_slug: "no-pipelines-repo"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("Pipelines are not enabled");
        });
    });

    describe("executeGetPipeline", () => {
        it("calls client with correct endpoint", async () => {
            mockClient.get.mockResolvedValueOnce(mockPipeline);

            await executeGetPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pipeline_uuid: "{pipe-1111-2222-3333-444455556666}"
            });

            expect(mockClient.get).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pipelines/{pipe-1111-2222-3333-444455556666}"
            );
        });

        it("returns full pipeline details with state info", async () => {
            mockClient.get.mockResolvedValueOnce(mockPipeline);

            const result = await executeGetPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pipeline_uuid: "{pipe-1111-2222-3333-444455556666}"
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.uuid).toBe(mockPipeline.uuid);
            expect(data.build_number).toBe(245);
            expect(data.run_number).toBe(245);
            expect(data.state).toEqual({
                type: "pipeline_state_completed",
                name: "COMPLETED",
                result: {
                    type: "pipeline_state_completed_successful",
                    name: "SUCCESSFUL"
                },
                stage: null
            });
            expect(data.first_successful).toBe(false);
            expect(data.expired).toBe(false);
        });

        it("returns error when pipeline not found", async () => {
            mockClient.get.mockRejectedValueOnce(new Error("Pipeline not found"));

            const result = await executeGetPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                pipeline_uuid: "{nonexistent}"
            });

            expect(result.success).toBe(false);
            expect(result.error?.retryable).toBe(true);
        });
    });

    describe("executeTriggerPipeline", () => {
        it("calls client with correct params for branch trigger", async () => {
            const pendingPipeline: BitbucketPipeline = {
                ...mockPipeline,
                state: { type: "pipeline_state_pending", name: "PENDING" }
            };
            mockClient.post.mockResolvedValueOnce(pendingPipeline);

            await executeTriggerPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                target_type: "branch",
                target_ref: "main"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pipelines",
                {
                    target: {
                        type: "pipeline_ref_target",
                        ref_type: "branch",
                        ref_name: "main"
                    }
                }
            );
        });

        it("includes selector for custom pipelines", async () => {
            mockClient.post.mockResolvedValueOnce(mockPipeline);

            await executeTriggerPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                target_type: "branch",
                target_ref: "main",
                selector_type: "custom",
                selector_pattern: "deploy-production"
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pipelines",
                {
                    target: {
                        type: "pipeline_ref_target",
                        ref_type: "branch",
                        ref_name: "main",
                        selector: {
                            type: "custom",
                            pattern: "deploy-production"
                        }
                    }
                }
            );
        });

        it("includes variables when specified", async () => {
            mockClient.post.mockResolvedValueOnce(mockPipeline);

            await executeTriggerPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                target_type: "branch",
                target_ref: "main",
                variables: [
                    { key: "ENV", value: "production", secured: false },
                    { key: "API_KEY", value: "secret", secured: true }
                ]
            });

            expect(mockClient.post).toHaveBeenCalledWith(
                "/repositories/acme-corp/backend-api/pipelines",
                expect.objectContaining({
                    variables: [
                        { key: "ENV", value: "production", secured: false },
                        { key: "API_KEY", value: "secret", secured: true }
                    ]
                })
            );
        });

        it("returns normalized output on success", async () => {
            const pendingPipeline: BitbucketPipeline = {
                ...mockPipeline,
                state: { type: "pipeline_state_pending", name: "PENDING" }
            };
            mockClient.post.mockResolvedValueOnce(pendingPipeline);

            const result = await executeTriggerPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "backend-api",
                target_type: "branch",
                target_ref: "main"
            });

            expect(result.success).toBe(true);
            const data = result.data as Record<string, unknown>;
            expect(data.uuid).toBe(mockPipeline.uuid);
            expect(data.build_number).toBe(245);
            expect(data.state).toEqual({ name: "PENDING", result: undefined });
        });

        it("returns validation error when pipelines not enabled", async () => {
            mockClient.post.mockRejectedValueOnce(new Error("404 not found"));

            const result = await executeTriggerPipeline(mockClient, {
                workspace: "acme-corp",
                repo_slug: "no-pipelines-repo",
                target_type: "branch",
                target_ref: "main"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("validation");
            expect(result.error?.message).toContain("Pipelines are not enabled");
        });
    });

    // =========================================================================
    // SCHEMA VALIDATION TESTS
    // =========================================================================

    describe("schema validation", () => {
        describe("listRepositoriesSchema", () => {
            it("validates minimal input", () => {
                const result = listRepositoriesSchema.safeParse({
                    workspace: "acme-corp"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with pagination", () => {
                const result = listRepositoriesSchema.safeParse({
                    workspace: "acme-corp",
                    role: "admin",
                    q: 'name~"api"',
                    sort: "-updated_on",
                    pagelen: 50,
                    page: 2
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace", () => {
                const result = listRepositoriesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects invalid role", () => {
                const result = listRepositoriesSchema.safeParse({
                    workspace: "acme-corp",
                    role: "invalid_role"
                });
                expect(result.success).toBe(false);
            });

            it("rejects pagelen over 100", () => {
                const result = listRepositoriesSchema.safeParse({
                    workspace: "acme-corp",
                    pagelen: 150
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listRepositoriesSchema.parse({ workspace: "acme-corp" });
                expect(result.pagelen).toBe(20);
                expect(result.page).toBe(1);
            });
        });

        describe("getRepositorySchema", () => {
            it("validates required fields", () => {
                const result = getRepositorySchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workspace", () => {
                const result = getRepositorySchema.safeParse({
                    repo_slug: "backend-api"
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing repo_slug", () => {
                const result = getRepositorySchema.safeParse({
                    workspace: "acme-corp"
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createRepositorySchema", () => {
            it("validates minimal input", () => {
                const result = createRepositorySchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "new-repo"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createRepositorySchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "new-repo",
                    name: "New Repository",
                    description: "A new repo",
                    is_private: false,
                    has_issues: true,
                    has_wiki: false,
                    fork_policy: "no_public_forks",
                    project_key: "PROJ",
                    language: "typescript"
                });
                expect(result.success).toBe(true);
            });

            it("rejects invalid fork_policy", () => {
                const result = createRepositorySchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "new-repo",
                    fork_policy: "invalid_policy"
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = createRepositorySchema.parse({
                    workspace: "acme-corp",
                    repo_slug: "new-repo"
                });
                expect(result.is_private).toBe(true);
                expect(result.has_issues).toBe(true);
                expect(result.has_wiki).toBe(true);
                expect(result.fork_policy).toBe("allow_forks");
            });
        });

        describe("deleteRepositorySchema", () => {
            it("validates required fields", () => {
                const result = deleteRepositorySchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "old-repo"
                });
                expect(result.success).toBe(true);
            });
        });

        describe("listPullRequestsSchema", () => {
            it("validates minimal input", () => {
                const result = listPullRequestsSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                });
                expect(result.success).toBe(true);
            });

            it("validates all state values", () => {
                for (const state of ["OPEN", "MERGED", "DECLINED", "SUPERSEDED"]) {
                    const result = listPullRequestsSchema.safeParse({
                        workspace: "acme-corp",
                        repo_slug: "backend-api",
                        state
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("rejects pagelen over 50", () => {
                const result = listPullRequestsSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pagelen: 100
                });
                expect(result.success).toBe(false);
            });

            it("applies defaults", () => {
                const result = listPullRequestsSchema.parse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                });
                expect(result.state).toBe("OPEN");
                expect(result.pagelen).toBe(20);
                expect(result.page).toBe(1);
            });
        });

        describe("getPullRequestSchema", () => {
            it("validates required fields", () => {
                const result = getPullRequestSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42
                });
                expect(result.success).toBe(true);
            });

            it("rejects non-integer pull_request_id", () => {
                const result = getPullRequestSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42.5
                });
                expect(result.success).toBe(false);
            });
        });

        describe("createPullRequestSchema", () => {
            it("validates minimal input", () => {
                const result = createPullRequestSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "New PR",
                    source_branch: "feature/test",
                    destination_branch: "main"
                });
                expect(result.success).toBe(true);
            });

            it("validates with reviewers array", () => {
                const result = createPullRequestSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "New PR",
                    source_branch: "feature/test",
                    destination_branch: "main",
                    reviewers: ["{uuid-1}", "{uuid-2}"]
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = createPullRequestSchema.parse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "New PR",
                    source_branch: "feature/test",
                    destination_branch: "main"
                });
                expect(result.close_source_branch).toBe(false);
            });
        });

        describe("updatePullRequestSchema", () => {
            it("validates minimal input", () => {
                const result = updatePullRequestSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42
                });
                expect(result.success).toBe(true);
            });

            it("validates with all optional fields", () => {
                const result = updatePullRequestSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42,
                    title: "Updated title",
                    description: "Updated description",
                    destination_branch: "develop",
                    close_source_branch: true,
                    reviewers: ["{uuid}"]
                });
                expect(result.success).toBe(true);
            });
        });

        describe("mergePullRequestSchema", () => {
            it("validates minimal input", () => {
                const result = mergePullRequestSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42
                });
                expect(result.success).toBe(true);
            });

            it("validates all merge strategies", () => {
                for (const strategy of ["merge_commit", "squash", "fast_forward"]) {
                    const result = mergePullRequestSchema.safeParse({
                        workspace: "acme-corp",
                        repo_slug: "backend-api",
                        pull_request_id: 42,
                        merge_strategy: strategy
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("applies defaults", () => {
                const result = mergePullRequestSchema.parse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pull_request_id: 42
                });
                expect(result.merge_strategy).toBe("merge_commit");
            });
        });

        describe("listIssuesSchema", () => {
            it("validates minimal input", () => {
                const result = listIssuesSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                });
                expect(result.success).toBe(true);
            });

            it("validates all state values", () => {
                for (const state of [
                    "new",
                    "open",
                    "resolved",
                    "on hold",
                    "invalid",
                    "duplicate",
                    "wontfix",
                    "closed"
                ]) {
                    const result = listIssuesSchema.safeParse({
                        workspace: "acme-corp",
                        repo_slug: "backend-api",
                        state
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("validates all priority values", () => {
                for (const priority of ["trivial", "minor", "major", "critical", "blocker"]) {
                    const result = listIssuesSchema.safeParse({
                        workspace: "acme-corp",
                        repo_slug: "backend-api",
                        priority
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("validates all kind values", () => {
                for (const kind of ["bug", "enhancement", "proposal", "task"]) {
                    const result = listIssuesSchema.safeParse({
                        workspace: "acme-corp",
                        repo_slug: "backend-api",
                        kind
                    });
                    expect(result.success).toBe(true);
                }
            });
        });

        describe("createIssueSchema", () => {
            it("validates minimal input", () => {
                const result = createIssueSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "New issue"
                });
                expect(result.success).toBe(true);
            });

            it("validates full input", () => {
                const result = createIssueSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "New issue",
                    content: "Description",
                    kind: "enhancement",
                    priority: "critical",
                    assignee_uuid: "{uuid}",
                    component: "api",
                    milestone: "v2.0",
                    version: "1.5.0"
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = createIssueSchema.parse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    title: "New issue"
                });
                expect(result.kind).toBe("bug");
                expect(result.priority).toBe("major");
            });
        });

        describe("listPipelinesSchema", () => {
            it("validates minimal input", () => {
                const result = listPipelinesSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                });
                expect(result.success).toBe(true);
            });

            it("validates with sort", () => {
                const result = listPipelinesSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    sort: "-created_on"
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = listPipelinesSchema.parse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api"
                });
                expect(result.pagelen).toBe(20);
                expect(result.page).toBe(1);
            });
        });

        describe("getPipelineSchema", () => {
            it("validates required fields", () => {
                const result = getPipelineSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pipeline_uuid: "{uuid}"
                });
                expect(result.success).toBe(true);
            });

            it("rejects empty pipeline_uuid", () => {
                const result = getPipelineSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    pipeline_uuid: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("triggerPipelineSchema", () => {
            it("validates minimal input", () => {
                const result = triggerPipelineSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    target_ref: "main"
                });
                expect(result.success).toBe(true);
            });

            it("validates all target types", () => {
                for (const target_type of ["branch", "tag", "commit", "pullrequest"]) {
                    const result = triggerPipelineSchema.safeParse({
                        workspace: "acme-corp",
                        repo_slug: "backend-api",
                        target_type,
                        target_ref: "main"
                    });
                    expect(result.success).toBe(true);
                }
            });

            it("validates with custom pipeline selector", () => {
                const result = triggerPipelineSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    target_ref: "main",
                    selector_type: "custom",
                    selector_pattern: "deploy-production"
                });
                expect(result.success).toBe(true);
            });

            it("validates with variables", () => {
                const result = triggerPipelineSchema.safeParse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    target_ref: "main",
                    variables: [
                        { key: "ENV", value: "prod" },
                        { key: "SECRET", value: "xxx", secured: true }
                    ]
                });
                expect(result.success).toBe(true);
            });

            it("applies defaults", () => {
                const result = triggerPipelineSchema.parse({
                    workspace: "acme-corp",
                    repo_slug: "backend-api",
                    target_ref: "main"
                });
                expect(result.target_type).toBe("branch");
            });
        });
    });
});
