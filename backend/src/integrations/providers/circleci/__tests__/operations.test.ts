/**
 * CircleCI Operation Executor Tests
 *
 * Tests individual operation executors in isolation with mocked clients.
 */

import { executeCancelWorkflow, cancelWorkflowSchema } from "../operations/cancelWorkflow";
import { executeGetJobArtifacts, getJobArtifactsSchema } from "../operations/getJobArtifacts";
import { executeGetPipeline, getPipelineSchema } from "../operations/getPipeline";
import { executeGetWorkflow, getWorkflowSchema } from "../operations/getWorkflow";
import { executeListJobs, listJobsSchema } from "../operations/listJobs";
import { executeListPipelines, listPipelinesSchema } from "../operations/listPipelines";
import { executeListWorkflows, listWorkflowsSchema } from "../operations/listWorkflows";
import { executeRerunWorkflow, rerunWorkflowSchema } from "../operations/rerunWorkflow";
import { executeTriggerPipeline, triggerPipelineSchema } from "../operations/triggerPipeline";
import type { CircleCIClient } from "../client/CircleCIClient";

// Mock CircleCIClient factory
function createMockCircleCIClient(): jest.Mocked<CircleCIClient> {
    return {
        cancelWorkflow: jest.fn(),
        getJobArtifacts: jest.fn(),
        getPipeline: jest.fn(),
        getWorkflow: jest.fn(),
        listJobs: jest.fn(),
        listPipelines: jest.fn(),
        listWorkflows: jest.fn(),
        rerunWorkflow: jest.fn(),
        triggerPipeline: jest.fn(),
        getCurrentUser: jest.fn(),
        getProject: jest.fn(),
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
        request: jest.fn()
    } as unknown as jest.Mocked<CircleCIClient>;
}

describe("CircleCI Operation Executors", () => {
    let mockClient: jest.Mocked<CircleCIClient>;

    beforeEach(() => {
        mockClient = createMockCircleCIClient();
    });

    describe("executeCancelWorkflow", () => {
        it("calls client with correct params", async () => {
            mockClient.cancelWorkflow.mockResolvedValueOnce({
                message: "Workflow canceled"
            });

            await executeCancelWorkflow(mockClient, {
                workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
            });

            expect(mockClient.cancelWorkflow).toHaveBeenCalledWith(
                "5034460f-c7c4-4c43-9457-de07e2029e7b"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.cancelWorkflow.mockResolvedValueOnce({
                message: "Workflow canceled"
            });

            const result = await executeCancelWorkflow(mockClient, {
                workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                message: "Workflow canceled"
            });
        });

        it("returns default message when API response has no message", async () => {
            mockClient.cancelWorkflow.mockResolvedValueOnce({
                message: ""
            });

            const result = await executeCancelWorkflow(mockClient, {
                workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
            });

            expect(result.success).toBe(true);
            expect(result.data?.message).toBe(
                "Workflow 5034460f-c7c4-4c43-9457-de07e2029e7b canceled successfully"
            );
        });

        it("returns error on client failure", async () => {
            mockClient.cancelWorkflow.mockRejectedValueOnce(new Error("Workflow not found"));

            const result = await executeCancelWorkflow(mockClient, {
                workflowId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Workflow not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.cancelWorkflow.mockRejectedValueOnce("string error");

            const result = await executeCancelWorkflow(mockClient, {
                workflowId: "test-workflow-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to cancel workflow");
        });
    });

    describe("executeGetJobArtifacts", () => {
        it("calls client with correct params", async () => {
            mockClient.getJobArtifacts.mockResolvedValueOnce([]);

            await executeGetJobArtifacts(mockClient, {
                projectSlug: "gh/acme-corp/web-application",
                jobNumber: 1542
            });

            expect(mockClient.getJobArtifacts).toHaveBeenCalledWith(
                "gh/acme-corp/web-application",
                1542
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getJobArtifacts.mockResolvedValueOnce([
                {
                    path: "test-results/junit.xml",
                    url: "https://circleci.com/gh/acme-corp/web-application/1542/artifacts/0/test-results/junit.xml",
                    node_index: 0
                },
                {
                    path: "coverage/lcov-report/index.html",
                    url: "https://circleci.com/gh/acme-corp/web-application/1542/artifacts/0/coverage/lcov-report/index.html",
                    node_index: 0
                }
            ]);

            const result = await executeGetJobArtifacts(mockClient, {
                projectSlug: "gh/acme-corp/web-application",
                jobNumber: 1542
            });

            expect(result.success).toBe(true);
            expect(result.data?.artifacts).toHaveLength(2);
            expect(result.data?.artifacts[0]).toEqual({
                path: "test-results/junit.xml",
                url: "https://circleci.com/gh/acme-corp/web-application/1542/artifacts/0/test-results/junit.xml",
                nodeIndex: 0
            });
            expect(result.data?.count).toBe(2);
        });

        it("returns empty artifacts array when job has no artifacts", async () => {
            mockClient.getJobArtifacts.mockResolvedValueOnce([]);

            const result = await executeGetJobArtifacts(mockClient, {
                projectSlug: "gh/acme-corp/simple-lib",
                jobNumber: 234
            });

            expect(result.success).toBe(true);
            expect(result.data?.artifacts).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("handles parallel job artifacts with different node indices", async () => {
            mockClient.getJobArtifacts.mockResolvedValueOnce([
                { path: "results/node-0.xml", url: "https://url/0", node_index: 0 },
                { path: "results/node-1.xml", url: "https://url/1", node_index: 1 },
                { path: "results/node-2.xml", url: "https://url/2", node_index: 2 }
            ]);

            const result = await executeGetJobArtifacts(mockClient, {
                projectSlug: "gh/acme-corp/monorepo",
                jobNumber: 5678
            });

            expect(result.success).toBe(true);
            expect(result.data?.artifacts).toHaveLength(3);
            expect(result.data?.artifacts[0].nodeIndex).toBe(0);
            expect(result.data?.artifacts[1].nodeIndex).toBe(1);
            expect(result.data?.artifacts[2].nodeIndex).toBe(2);
        });

        it("returns error on client failure", async () => {
            mockClient.getJobArtifacts.mockRejectedValueOnce(new Error("Job not found"));

            const result = await executeGetJobArtifacts(mockClient, {
                projectSlug: "gh/acme-corp/web-application",
                jobNumber: 999999
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Job not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getJobArtifacts.mockRejectedValueOnce("string error");

            const result = await executeGetJobArtifacts(mockClient, {
                projectSlug: "gh/test/repo",
                jobNumber: 100
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get job artifacts");
        });
    });

    describe("executeGetPipeline", () => {
        it("calls client with correct params", async () => {
            mockClient.getPipeline.mockResolvedValueOnce({
                id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                number: 1542,
                project_slug: "gh/acme-corp/web-application",
                state: "created",
                created_at: "2024-01-15T10:30:00.000Z",
                errors: [],
                trigger: {
                    type: "webhook",
                    received_at: "2024-01-15T10:30:00.000Z",
                    actor: { login: "jsmith" }
                }
            });

            await executeGetPipeline(mockClient, {
                pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
            });

            expect(mockClient.getPipeline).toHaveBeenCalledWith(
                "5034460f-c7c4-4c43-9457-de07e2029e7b"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getPipeline.mockResolvedValueOnce({
                id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                number: 1542,
                project_slug: "gh/acme-corp/web-application",
                state: "created",
                created_at: "2024-01-15T10:30:00.000Z",
                errors: [],
                trigger: {
                    type: "webhook",
                    received_at: "2024-01-15T10:30:00.000Z",
                    actor: { login: "jsmith" }
                },
                vcs: {
                    provider_name: "github",
                    origin_repository_url: "https://github.com/acme-corp/web-application",
                    target_repository_url: "https://github.com/acme-corp/web-application",
                    revision: "abc123def456789012345678901234567890abcd",
                    branch: "main",
                    commit: {
                        subject: "feat: Add user authentication module"
                    }
                }
            });

            const result = await executeGetPipeline(mockClient, {
                pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipeline).toEqual({
                id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                number: 1542,
                projectSlug: "gh/acme-corp/web-application",
                state: "created",
                createdAt: "2024-01-15T10:30:00.000Z",
                trigger: {
                    type: "webhook",
                    actor: "jsmith"
                },
                vcs: {
                    branch: "main",
                    tag: undefined,
                    revision: "abc123def456789012345678901234567890abcd",
                    commitSubject: "feat: Add user authentication module"
                }
            });
        });

        it("handles pipeline triggered by tag", async () => {
            mockClient.getPipeline.mockResolvedValueOnce({
                id: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                number: 2100,
                project_slug: "gh/acme-corp/backend-api",
                state: "created",
                created_at: "2024-01-20T14:45:00.000Z",
                errors: [],
                trigger: {
                    type: "webhook",
                    received_at: "2024-01-20T14:45:00.000Z",
                    actor: { login: "releasebot" }
                },
                vcs: {
                    provider_name: "github",
                    origin_repository_url: "https://github.com/acme-corp/backend-api",
                    target_repository_url: "https://github.com/acme-corp/backend-api",
                    revision: "fedcba9876543210fedcba9876543210fedcba98",
                    tag: "v2.1.0",
                    commit: {
                        subject: "Release v2.1.0"
                    }
                }
            });

            const result = await executeGetPipeline(mockClient, {
                pipelineId: "b2c3d4e5-f6a7-8901-bcde-f23456789012"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipeline.vcs?.tag).toBe("v2.1.0");
            expect(result.data?.pipeline.vcs?.branch).toBeUndefined();
        });

        it("handles pipeline without VCS info", async () => {
            mockClient.getPipeline.mockResolvedValueOnce({
                id: "c3d4e5f6-a789-0123-cdef-456789012345",
                number: 3456,
                project_slug: "gh/acme-corp/infrastructure",
                state: "created",
                created_at: "2024-01-25T08:00:00.000Z",
                errors: [],
                trigger: {
                    type: "api",
                    received_at: "2024-01-25T08:00:00.000Z",
                    actor: { login: "deploy-service" }
                }
            });

            const result = await executeGetPipeline(mockClient, {
                pipelineId: "c3d4e5f6-a789-0123-cdef-456789012345"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipeline.vcs).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.getPipeline.mockRejectedValueOnce(new Error("Pipeline not found"));

            const result = await executeGetPipeline(mockClient, {
                pipelineId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Pipeline not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getPipeline.mockRejectedValueOnce("string error");

            const result = await executeGetPipeline(mockClient, {
                pipelineId: "test-pipeline-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get pipeline");
        });
    });

    describe("executeGetWorkflow", () => {
        it("calls client with correct params", async () => {
            mockClient.getWorkflow.mockResolvedValueOnce({
                id: "e5f6a7b8-9012-3456-ef01-234567890abc",
                name: "build-test-deploy",
                pipeline_id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                pipeline_number: 1542,
                project_slug: "gh/acme-corp/web-application",
                status: "success",
                started_by: "jsmith",
                created_at: "2024-01-15T10:30:15.000Z",
                stopped_at: "2024-01-15T10:45:32.000Z"
            });

            await executeGetWorkflow(mockClient, {
                workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
            });

            expect(mockClient.getWorkflow).toHaveBeenCalledWith(
                "e5f6a7b8-9012-3456-ef01-234567890abc"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.getWorkflow.mockResolvedValueOnce({
                id: "e5f6a7b8-9012-3456-ef01-234567890abc",
                name: "build-test-deploy",
                pipeline_id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                pipeline_number: 1542,
                project_slug: "gh/acme-corp/web-application",
                status: "success",
                started_by: "jsmith",
                created_at: "2024-01-15T10:30:15.000Z",
                stopped_at: "2024-01-15T10:45:32.000Z"
            });

            const result = await executeGetWorkflow(mockClient, {
                workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
            });

            expect(result.success).toBe(true);
            expect(result.data?.workflow).toEqual({
                id: "e5f6a7b8-9012-3456-ef01-234567890abc",
                name: "build-test-deploy",
                pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                pipelineNumber: 1542,
                projectSlug: "gh/acme-corp/web-application",
                status: "success",
                startedBy: "jsmith",
                createdAt: "2024-01-15T10:30:15.000Z",
                stoppedAt: "2024-01-15T10:45:32.000Z"
            });
        });

        it("handles running workflow without stoppedAt", async () => {
            mockClient.getWorkflow.mockResolvedValueOnce({
                id: "a7b8c9d0-1234-5678-a123-456789012cde",
                name: "deploy-staging",
                pipeline_id: "c3d4e5f6-a789-0123-cdef-456789012345",
                pipeline_number: 3456,
                project_slug: "gh/acme-corp/infrastructure",
                status: "running",
                started_by: "deploy-service",
                created_at: "2024-01-25T08:00:30.000Z"
            });

            const result = await executeGetWorkflow(mockClient, {
                workflowId: "a7b8c9d0-1234-5678-a123-456789012cde"
            });

            expect(result.success).toBe(true);
            expect(result.data?.workflow.status).toBe("running");
            expect(result.data?.workflow.stoppedAt).toBeUndefined();
        });

        it("handles workflow with different statuses", async () => {
            const statuses = ["failed", "on_hold", "canceled"] as const;

            for (const status of statuses) {
                mockClient.getWorkflow.mockResolvedValueOnce({
                    id: "test-workflow-id",
                    name: "test-workflow",
                    pipeline_id: "test-pipeline-id",
                    pipeline_number: 100,
                    project_slug: "gh/test/repo",
                    status,
                    started_by: "tester",
                    created_at: "2024-01-15T10:00:00.000Z"
                });

                const result = await executeGetWorkflow(mockClient, {
                    workflowId: "test-workflow-id"
                });

                expect(result.success).toBe(true);
                expect(result.data?.workflow.status).toBe(status);
            }
        });

        it("returns error on client failure", async () => {
            mockClient.getWorkflow.mockRejectedValueOnce(new Error("Workflow not found"));

            const result = await executeGetWorkflow(mockClient, {
                workflowId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Workflow not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.getWorkflow.mockRejectedValueOnce("string error");

            const result = await executeGetWorkflow(mockClient, {
                workflowId: "test-workflow-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to get workflow");
        });
    });

    describe("executeListJobs", () => {
        it("calls client with correct params", async () => {
            mockClient.listJobs.mockResolvedValueOnce([]);

            await executeListJobs(mockClient, {
                workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
            });

            expect(mockClient.listJobs).toHaveBeenCalledWith(
                "e5f6a7b8-9012-3456-ef01-234567890abc"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.listJobs.mockResolvedValueOnce([
                {
                    id: "job-1-uuid-checkout",
                    name: "checkout",
                    job_number: 15420,
                    project_slug: "gh/acme-corp/web-application",
                    status: "success",
                    type: "build",
                    started_at: "2024-01-15T10:30:15.000Z",
                    stopped_at: "2024-01-15T10:31:02.000Z",
                    dependencies: []
                },
                {
                    id: "job-2-uuid-install-deps",
                    name: "install-dependencies",
                    job_number: 15421,
                    project_slug: "gh/acme-corp/web-application",
                    status: "success",
                    type: "build",
                    started_at: "2024-01-15T10:31:05.000Z",
                    stopped_at: "2024-01-15T10:33:45.000Z",
                    dependencies: ["job-1-uuid-checkout"]
                }
            ]);

            const result = await executeListJobs(mockClient, {
                workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
            });

            expect(result.success).toBe(true);
            expect(result.data?.jobs).toHaveLength(2);
            expect(result.data?.jobs[0]).toEqual({
                id: "job-1-uuid-checkout",
                name: "checkout",
                jobNumber: 15420,
                projectSlug: "gh/acme-corp/web-application",
                status: "success",
                type: "build",
                startedAt: "2024-01-15T10:30:15.000Z",
                stoppedAt: "2024-01-15T10:31:02.000Z",
                dependencies: []
            });
            expect(result.data?.jobs[1].dependencies).toEqual(["job-1-uuid-checkout"]);
            expect(result.data?.count).toBe(2);
        });

        it("handles jobs with approval type", async () => {
            mockClient.listJobs.mockResolvedValueOnce([
                {
                    id: "job-y-uuid-approve",
                    name: "approve-production-deploy",
                    project_slug: "gh/acme-corp/web-application",
                    status: "on_hold",
                    type: "approval",
                    dependencies: ["job-x-uuid-build"]
                }
            ]);

            const result = await executeListJobs(mockClient, {
                workflowId: "b8c9d0e1-2345-6789-b234-567890123def"
            });

            expect(result.success).toBe(true);
            expect(result.data?.jobs[0].type).toBe("approval");
            expect(result.data?.jobs[0].jobNumber).toBeUndefined();
            expect(result.data?.jobs[0].startedAt).toBeUndefined();
        });

        it("handles blocked jobs", async () => {
            mockClient.listJobs.mockResolvedValueOnce([
                {
                    id: "job-c-uuid-deploy",
                    name: "deploy",
                    project_slug: "gh/acme-corp/backend-api",
                    status: "blocked",
                    type: "build",
                    dependencies: ["job-b-uuid-integration"]
                }
            ]);

            const result = await executeListJobs(mockClient, {
                workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
            });

            expect(result.success).toBe(true);
            expect(result.data?.jobs[0].status).toBe("blocked");
        });

        it("returns empty jobs array for empty workflow", async () => {
            mockClient.listJobs.mockResolvedValueOnce([]);

            const result = await executeListJobs(mockClient, {
                workflowId: "empty-workflow-id"
            });

            expect(result.success).toBe(true);
            expect(result.data?.jobs).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("returns error on client failure", async () => {
            mockClient.listJobs.mockRejectedValueOnce(new Error("Workflow not found"));

            const result = await executeListJobs(mockClient, {
                workflowId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Workflow not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listJobs.mockRejectedValueOnce("string error");

            const result = await executeListJobs(mockClient, {
                workflowId: "test-workflow-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list jobs");
        });
    });

    describe("executeListPipelines", () => {
        it("calls client with correct params for project only", async () => {
            mockClient.listPipelines.mockResolvedValueOnce([]);

            await executeListPipelines(mockClient, {
                projectSlug: "gh/acme-corp/web-application"
            });

            expect(mockClient.listPipelines).toHaveBeenCalledWith("gh/acme-corp/web-application", {
                branch: undefined
            });
        });

        it("calls client with branch filter", async () => {
            mockClient.listPipelines.mockResolvedValueOnce([]);

            await executeListPipelines(mockClient, {
                projectSlug: "gh/acme-corp/backend-api",
                branch: "main"
            });

            expect(mockClient.listPipelines).toHaveBeenCalledWith("gh/acme-corp/backend-api", {
                branch: "main"
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.listPipelines.mockResolvedValueOnce([
                {
                    id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                    number: 1545,
                    project_slug: "gh/acme-corp/web-application",
                    state: "created",
                    created_at: "2024-01-28T14:30:00.000Z",
                    errors: [],
                    trigger: {
                        type: "webhook",
                        received_at: "2024-01-28T14:30:00.000Z",
                        actor: { login: "developer1" }
                    },
                    vcs: {
                        provider_name: "github",
                        origin_repository_url: "https://github.com/acme-corp/web-application",
                        target_repository_url: "https://github.com/acme-corp/web-application",
                        revision: "abc123def456789012345678901234567890abcd",
                        branch: "feature/user-dashboard",
                        commit: {
                            subject: "feat: Add user dashboard analytics"
                        }
                    }
                }
            ]);

            const result = await executeListPipelines(mockClient, {
                projectSlug: "gh/acme-corp/web-application"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipelines).toHaveLength(1);
            expect(result.data?.pipelines[0]).toEqual({
                id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                number: 1545,
                projectSlug: "gh/acme-corp/web-application",
                state: "created",
                createdAt: "2024-01-28T14:30:00.000Z",
                trigger: {
                    type: "webhook",
                    actor: "developer1"
                },
                vcs: {
                    branch: "feature/user-dashboard",
                    tag: undefined,
                    revision: "abc123def456789012345678901234567890abcd",
                    commitSubject: "feat: Add user dashboard analytics"
                }
            });
            expect(result.data?.count).toBe(1);
        });

        it("returns empty pipelines array for project with no recent pipelines", async () => {
            mockClient.listPipelines.mockResolvedValueOnce([]);

            const result = await executeListPipelines(mockClient, {
                projectSlug: "gh/acme-corp/archived-project",
                branch: "legacy"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipelines).toEqual([]);
            expect(result.data?.count).toBe(0);
        });

        it("handles Bitbucket project slugs", async () => {
            mockClient.listPipelines.mockResolvedValueOnce([
                {
                    id: "bb-pipeline-uuid-001",
                    number: 234,
                    project_slug: "bb/startup-io/microservices",
                    state: "created",
                    created_at: "2024-01-28T10:00:00.000Z",
                    errors: [],
                    trigger: {
                        type: "webhook",
                        received_at: "2024-01-28T10:00:00.000Z",
                        actor: { login: "bb-developer" }
                    },
                    vcs: {
                        provider_name: "bitbucket",
                        origin_repository_url: "https://bitbucket.org/startup-io/microservices",
                        target_repository_url: "https://bitbucket.org/startup-io/microservices",
                        revision: "bbrevision123456789012345678901234567890",
                        branch: "feature/api-v2",
                        commit: {
                            subject: "feat: Implement API v2 endpoints"
                        }
                    }
                }
            ]);

            const result = await executeListPipelines(mockClient, {
                projectSlug: "bb/startup-io/microservices"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipelines[0].projectSlug).toBe("bb/startup-io/microservices");
        });

        it("returns error on client failure", async () => {
            mockClient.listPipelines.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeListPipelines(mockClient, {
                projectSlug: "gh/nonexistent-org/fake-repo"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Project not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listPipelines.mockRejectedValueOnce("string error");

            const result = await executeListPipelines(mockClient, {
                projectSlug: "gh/test/repo"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list pipelines");
        });
    });

    describe("executeListWorkflows", () => {
        it("calls client with correct params", async () => {
            mockClient.listWorkflows.mockResolvedValueOnce([]);

            await executeListWorkflows(mockClient, {
                pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
            });

            expect(mockClient.listWorkflows).toHaveBeenCalledWith(
                "5034460f-c7c4-4c43-9457-de07e2029e7b"
            );
        });

        it("returns normalized output on success", async () => {
            mockClient.listWorkflows.mockResolvedValueOnce([
                {
                    id: "e5f6a7b8-9012-3456-ef01-234567890abc",
                    name: "build-test-deploy",
                    pipeline_id: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                    pipeline_number: 1542,
                    project_slug: "gh/acme-corp/web-application",
                    status: "success",
                    started_by: "jsmith",
                    created_at: "2024-01-15T10:30:15.000Z",
                    stopped_at: "2024-01-15T10:45:32.000Z"
                }
            ]);

            const result = await executeListWorkflows(mockClient, {
                pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
            });

            expect(result.success).toBe(true);
            expect(result.data?.workflows).toHaveLength(1);
            expect(result.data?.workflows[0]).toEqual({
                id: "e5f6a7b8-9012-3456-ef01-234567890abc",
                name: "build-test-deploy",
                pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                pipelineNumber: 1542,
                projectSlug: "gh/acme-corp/web-application",
                status: "success",
                startedBy: "jsmith",
                createdAt: "2024-01-15T10:30:15.000Z",
                stoppedAt: "2024-01-15T10:45:32.000Z"
            });
            expect(result.data?.count).toBe(1);
        });

        it("handles multiple workflows in a pipeline", async () => {
            mockClient.listWorkflows.mockResolvedValueOnce([
                {
                    id: "workflow-build-uuid",
                    name: "build",
                    pipeline_id: "multi-workflow-pipeline-uuid",
                    pipeline_number: 3000,
                    project_slug: "gh/acme-corp/monorepo",
                    status: "success",
                    started_by: "monorepo-dev",
                    created_at: "2024-01-28T08:00:00.000Z",
                    stopped_at: "2024-01-28T08:15:00.000Z"
                },
                {
                    id: "workflow-test-uuid",
                    name: "test",
                    pipeline_id: "multi-workflow-pipeline-uuid",
                    pipeline_number: 3000,
                    project_slug: "gh/acme-corp/monorepo",
                    status: "success",
                    started_by: "monorepo-dev",
                    created_at: "2024-01-28T08:00:00.000Z",
                    stopped_at: "2024-01-28T08:25:00.000Z"
                },
                {
                    id: "workflow-deploy-prod-uuid",
                    name: "deploy-production",
                    pipeline_id: "multi-workflow-pipeline-uuid",
                    pipeline_number: 3000,
                    project_slug: "gh/acme-corp/monorepo",
                    status: "on_hold",
                    started_by: "monorepo-dev",
                    created_at: "2024-01-28T08:30:05.000Z"
                }
            ]);

            const result = await executeListWorkflows(mockClient, {
                pipelineId: "multi-workflow-pipeline-uuid"
            });

            expect(result.success).toBe(true);
            expect(result.data?.workflows).toHaveLength(3);
            expect(result.data?.count).toBe(3);
            expect(result.data?.workflows[2].status).toBe("on_hold");
            expect(result.data?.workflows[2].stoppedAt).toBeUndefined();
        });

        it("handles workflows with different statuses", async () => {
            mockClient.listWorkflows.mockResolvedValueOnce([
                {
                    id: "workflow-lint-failed-uuid",
                    name: "lint",
                    pipeline_id: "failed-pipeline-uuid",
                    pipeline_number: 4500,
                    project_slug: "gh/acme-corp/backend-api",
                    status: "failed",
                    started_by: "junior-dev",
                    created_at: "2024-01-28T14:00:00.000Z",
                    stopped_at: "2024-01-28T14:02:30.000Z"
                },
                {
                    id: "workflow-test-canceled-uuid",
                    name: "test",
                    pipeline_id: "failed-pipeline-uuid",
                    pipeline_number: 4500,
                    project_slug: "gh/acme-corp/backend-api",
                    status: "canceled",
                    started_by: "junior-dev",
                    created_at: "2024-01-28T14:00:00.000Z",
                    stopped_at: "2024-01-28T14:02:35.000Z"
                }
            ]);

            const result = await executeListWorkflows(mockClient, {
                pipelineId: "failed-pipeline-uuid"
            });

            expect(result.success).toBe(true);
            expect(result.data?.workflows[0].status).toBe("failed");
            expect(result.data?.workflows[1].status).toBe("canceled");
        });

        it("returns error on client failure", async () => {
            mockClient.listWorkflows.mockRejectedValueOnce(new Error("Pipeline not found"));

            const result = await executeListWorkflows(mockClient, {
                pipelineId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Pipeline not found");
            expect(result.error?.retryable).toBe(true);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.listWorkflows.mockRejectedValueOnce("string error");

            const result = await executeListWorkflows(mockClient, {
                pipelineId: "test-pipeline-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to list workflows");
        });
    });

    describe("executeRerunWorkflow", () => {
        it("calls client with minimal params", async () => {
            mockClient.rerunWorkflow.mockResolvedValueOnce({
                workflow_id: "new-workflow-uuid-rerun-001"
            });

            await executeRerunWorkflow(mockClient, {
                workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
            });

            expect(mockClient.rerunWorkflow).toHaveBeenCalledWith(
                "f6a7b8c9-0123-4567-f012-345678901bcd",
                {
                    from_failed: undefined,
                    enable_ssh: undefined,
                    jobs: undefined,
                    sparse_tree: undefined
                }
            );
        });

        it("calls client with fromFailed option", async () => {
            mockClient.rerunWorkflow.mockResolvedValueOnce({
                workflow_id: "new-workflow-uuid-from-failed"
            });

            await executeRerunWorkflow(mockClient, {
                workflowId: "failed-workflow-uuid-12345",
                fromFailed: true
            });

            expect(mockClient.rerunWorkflow).toHaveBeenCalledWith("failed-workflow-uuid-12345", {
                from_failed: true,
                enable_ssh: undefined,
                jobs: undefined,
                sparse_tree: undefined
            });
        });

        it("calls client with SSH debugging enabled", async () => {
            mockClient.rerunWorkflow.mockResolvedValueOnce({
                workflow_id: "new-workflow-uuid-with-ssh"
            });

            await executeRerunWorkflow(mockClient, {
                workflowId: "debug-workflow-uuid-67890",
                enableSsh: true
            });

            expect(mockClient.rerunWorkflow).toHaveBeenCalledWith("debug-workflow-uuid-67890", {
                from_failed: undefined,
                enable_ssh: true,
                jobs: undefined,
                sparse_tree: undefined
            });
        });

        it("calls client with specific jobs to rerun", async () => {
            mockClient.rerunWorkflow.mockResolvedValueOnce({
                workflow_id: "new-workflow-uuid-specific-jobs"
            });

            await executeRerunWorkflow(mockClient, {
                workflowId: "selective-rerun-workflow-uuid",
                jobs: ["job-3-uuid-lint", "job-4-uuid-unit-tests"],
                sparseTree: true
            });

            expect(mockClient.rerunWorkflow).toHaveBeenCalledWith("selective-rerun-workflow-uuid", {
                from_failed: undefined,
                enable_ssh: undefined,
                jobs: ["job-3-uuid-lint", "job-4-uuid-unit-tests"],
                sparse_tree: true
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.rerunWorkflow.mockResolvedValueOnce({
                workflow_id: "new-workflow-uuid-rerun-001"
            });

            const result = await executeRerunWorkflow(mockClient, {
                workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                originalWorkflowId: "f6a7b8c9-0123-4567-f012-345678901bcd",
                newWorkflowId: "new-workflow-uuid-rerun-001",
                message: "Workflow rerun triggered. New workflow ID: new-workflow-uuid-rerun-001"
            });
        });

        it("returns error on client failure", async () => {
            mockClient.rerunWorkflow.mockRejectedValueOnce(new Error("Workflow not found"));

            const result = await executeRerunWorkflow(mockClient, {
                workflowId: "00000000-0000-0000-0000-000000000000"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Workflow not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.rerunWorkflow.mockRejectedValueOnce("string error");

            const result = await executeRerunWorkflow(mockClient, {
                workflowId: "test-workflow-id"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to rerun workflow");
        });
    });

    describe("executeTriggerPipeline", () => {
        it("calls client with branch only", async () => {
            mockClient.triggerPipeline.mockResolvedValueOnce({
                id: "triggered-pipeline-uuid-001",
                number: 1550,
                project_slug: "gh/acme-corp/web-application",
                state: "pending",
                created_at: "2024-01-28T18:00:00.000Z",
                errors: [],
                trigger: {
                    type: "api",
                    received_at: "2024-01-28T18:00:00.000Z",
                    actor: { login: "api-user" }
                },
                vcs: {
                    provider_name: "github",
                    origin_repository_url: "https://github.com/acme-corp/web-application",
                    target_repository_url: "https://github.com/acme-corp/web-application",
                    revision: "latestcommit1234567890abcdef12345678",
                    branch: "main",
                    commit: {
                        subject: "Latest commit on main"
                    }
                }
            });

            await executeTriggerPipeline(mockClient, {
                projectSlug: "gh/acme-corp/web-application",
                branch: "main"
            });

            expect(mockClient.triggerPipeline).toHaveBeenCalledWith(
                "gh/acme-corp/web-application",
                {
                    branch: "main",
                    tag: undefined,
                    parameters: undefined
                }
            );
        });

        it("calls client with tag only", async () => {
            mockClient.triggerPipeline.mockResolvedValueOnce({
                id: "triggered-pipeline-uuid-002",
                number: 900,
                project_slug: "gh/acme-corp/backend-api",
                state: "pending",
                created_at: "2024-01-28T18:30:00.000Z",
                errors: [],
                trigger: {
                    type: "api",
                    received_at: "2024-01-28T18:30:00.000Z",
                    actor: { login: "release-manager" }
                },
                vcs: {
                    provider_name: "github",
                    origin_repository_url: "https://github.com/acme-corp/backend-api",
                    target_repository_url: "https://github.com/acme-corp/backend-api",
                    revision: "taggedcommit0987654321fedcba09876543",
                    tag: "v3.0.0",
                    commit: {
                        subject: "Release v3.0.0"
                    }
                }
            });

            await executeTriggerPipeline(mockClient, {
                projectSlug: "gh/acme-corp/backend-api",
                tag: "v3.0.0"
            });

            expect(mockClient.triggerPipeline).toHaveBeenCalledWith("gh/acme-corp/backend-api", {
                branch: undefined,
                tag: "v3.0.0",
                parameters: undefined
            });
        });

        it("calls client with custom parameters", async () => {
            mockClient.triggerPipeline.mockResolvedValueOnce({
                id: "triggered-pipeline-uuid-003",
                number: 5500,
                project_slug: "gh/acme-corp/infrastructure",
                state: "pending",
                created_at: "2024-01-28T19:00:00.000Z",
                errors: [],
                trigger: {
                    type: "api",
                    received_at: "2024-01-28T19:00:00.000Z",
                    actor: { login: "deploy-service" }
                },
                vcs: {
                    provider_name: "github",
                    origin_repository_url: "https://github.com/acme-corp/infrastructure",
                    target_repository_url: "https://github.com/acme-corp/infrastructure",
                    revision: "infracommit5678901234abcdef567890123",
                    branch: "main",
                    commit: {
                        subject: "Infrastructure update"
                    }
                }
            });

            await executeTriggerPipeline(mockClient, {
                projectSlug: "gh/acme-corp/infrastructure",
                branch: "main",
                parameters: {
                    environment: "staging",
                    deploy_region: "us-west-2",
                    run_e2e_tests: true
                }
            });

            expect(mockClient.triggerPipeline).toHaveBeenCalledWith("gh/acme-corp/infrastructure", {
                branch: "main",
                tag: undefined,
                parameters: {
                    environment: "staging",
                    deploy_region: "us-west-2",
                    run_e2e_tests: true
                }
            });
        });

        it("returns normalized output on success", async () => {
            mockClient.triggerPipeline.mockResolvedValueOnce({
                id: "triggered-pipeline-uuid-001",
                number: 1550,
                project_slug: "gh/acme-corp/web-application",
                state: "pending",
                created_at: "2024-01-28T18:00:00.000Z",
                errors: [],
                trigger: {
                    type: "api",
                    received_at: "2024-01-28T18:00:00.000Z",
                    actor: { login: "api-user" }
                },
                vcs: {
                    provider_name: "github",
                    origin_repository_url: "https://github.com/acme-corp/web-application",
                    target_repository_url: "https://github.com/acme-corp/web-application",
                    revision: "latestcommit1234567890abcdef12345678",
                    branch: "main",
                    commit: {
                        subject: "Latest commit on main"
                    }
                }
            });

            const result = await executeTriggerPipeline(mockClient, {
                projectSlug: "gh/acme-corp/web-application",
                branch: "main"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipeline).toEqual({
                id: "triggered-pipeline-uuid-001",
                number: 1550,
                projectSlug: "gh/acme-corp/web-application",
                state: "pending",
                createdAt: "2024-01-28T18:00:00.000Z",
                trigger: {
                    type: "api",
                    actor: "api-user"
                },
                vcs: {
                    branch: "main",
                    tag: undefined,
                    revision: "latestcommit1234567890abcdef12345678",
                    commitSubject: "Latest commit on main"
                }
            });
            expect(result.data?.message).toBe("Pipeline 1550 triggered successfully");
        });

        it("handles pipeline without VCS info", async () => {
            mockClient.triggerPipeline.mockResolvedValueOnce({
                id: "triggered-pipeline-uuid-no-vcs",
                number: 100,
                project_slug: "gh/test/repo",
                state: "pending",
                created_at: "2024-01-28T18:00:00.000Z",
                errors: [],
                trigger: {
                    type: "api",
                    received_at: "2024-01-28T18:00:00.000Z",
                    actor: { login: "test-user" }
                }
            });

            const result = await executeTriggerPipeline(mockClient, {
                projectSlug: "gh/test/repo"
            });

            expect(result.success).toBe(true);
            expect(result.data?.pipeline.vcs).toBeUndefined();
        });

        it("returns error on client failure", async () => {
            mockClient.triggerPipeline.mockRejectedValueOnce(new Error("Project not found"));

            const result = await executeTriggerPipeline(mockClient, {
                projectSlug: "gh/nonexistent-org/fake-repo",
                branch: "main"
            });

            expect(result.success).toBe(false);
            expect(result.error?.type).toBe("server_error");
            expect(result.error?.message).toBe("Project not found");
            expect(result.error?.retryable).toBe(false);
        });

        it("handles unknown errors gracefully", async () => {
            mockClient.triggerPipeline.mockRejectedValueOnce("string error");

            const result = await executeTriggerPipeline(mockClient, {
                projectSlug: "gh/test/repo",
                branch: "main"
            });

            expect(result.success).toBe(false);
            expect(result.error?.message).toBe("Failed to trigger pipeline");
        });
    });

    describe("Schema Validation", () => {
        describe("cancelWorkflowSchema", () => {
            it("validates valid input", () => {
                const result = cancelWorkflowSchema.safeParse({
                    workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workflowId", () => {
                const result = cancelWorkflowSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty workflowId", () => {
                const result = cancelWorkflowSchema.safeParse({
                    workflowId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getJobArtifactsSchema", () => {
            it("validates valid input", () => {
                const result = getJobArtifactsSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application",
                    jobNumber: 1542
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing projectSlug", () => {
                const result = getJobArtifactsSchema.safeParse({
                    jobNumber: 1542
                });
                expect(result.success).toBe(false);
            });

            it("rejects missing jobNumber", () => {
                const result = getJobArtifactsSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application"
                });
                expect(result.success).toBe(false);
            });

            it("rejects non-positive jobNumber", () => {
                const result = getJobArtifactsSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application",
                    jobNumber: 0
                });
                expect(result.success).toBe(false);
            });

            it("rejects negative jobNumber", () => {
                const result = getJobArtifactsSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application",
                    jobNumber: -1
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getPipelineSchema", () => {
            it("validates valid input", () => {
                const result = getPipelineSchema.safeParse({
                    pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing pipelineId", () => {
                const result = getPipelineSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty pipelineId", () => {
                const result = getPipelineSchema.safeParse({
                    pipelineId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("getWorkflowSchema", () => {
            it("validates valid input", () => {
                const result = getWorkflowSchema.safeParse({
                    workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workflowId", () => {
                const result = getWorkflowSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty workflowId", () => {
                const result = getWorkflowSchema.safeParse({
                    workflowId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listJobsSchema", () => {
            it("validates valid input", () => {
                const result = listJobsSchema.safeParse({
                    workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workflowId", () => {
                const result = listJobsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty workflowId", () => {
                const result = listJobsSchema.safeParse({
                    workflowId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listPipelinesSchema", () => {
            it("validates minimal input", () => {
                const result = listPipelinesSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with branch", () => {
                const result = listPipelinesSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application",
                    branch: "main"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing projectSlug", () => {
                const result = listPipelinesSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty projectSlug", () => {
                const result = listPipelinesSchema.safeParse({
                    projectSlug: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("listWorkflowsSchema", () => {
            it("validates valid input", () => {
                const result = listWorkflowsSchema.safeParse({
                    pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing pipelineId", () => {
                const result = listWorkflowsSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty pipelineId", () => {
                const result = listWorkflowsSchema.safeParse({
                    pipelineId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("rerunWorkflowSchema", () => {
            it("validates minimal input", () => {
                const result = rerunWorkflowSchema.safeParse({
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with fromFailed", () => {
                const result = rerunWorkflowSchema.safeParse({
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd",
                    fromFailed: true
                });
                expect(result.success).toBe(true);
            });

            it("validates input with enableSsh", () => {
                const result = rerunWorkflowSchema.safeParse({
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd",
                    enableSsh: true
                });
                expect(result.success).toBe(true);
            });

            it("validates input with specific jobs", () => {
                const result = rerunWorkflowSchema.safeParse({
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd",
                    jobs: ["job-1", "job-2"],
                    sparseTree: true
                });
                expect(result.success).toBe(true);
            });

            it("validates full input with all options", () => {
                const result = rerunWorkflowSchema.safeParse({
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd",
                    fromFailed: true,
                    enableSsh: true,
                    jobs: ["job-1"],
                    sparseTree: true
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing workflowId", () => {
                const result = rerunWorkflowSchema.safeParse({});
                expect(result.success).toBe(false);
            });

            it("rejects empty workflowId", () => {
                const result = rerunWorkflowSchema.safeParse({
                    workflowId: ""
                });
                expect(result.success).toBe(false);
            });
        });

        describe("triggerPipelineSchema", () => {
            it("validates minimal input with projectSlug only", () => {
                const result = triggerPipelineSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with branch", () => {
                const result = triggerPipelineSchema.safeParse({
                    projectSlug: "gh/acme-corp/web-application",
                    branch: "main"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with tag", () => {
                const result = triggerPipelineSchema.safeParse({
                    projectSlug: "gh/acme-corp/backend-api",
                    tag: "v3.0.0"
                });
                expect(result.success).toBe(true);
            });

            it("validates input with parameters", () => {
                const result = triggerPipelineSchema.safeParse({
                    projectSlug: "gh/acme-corp/infrastructure",
                    branch: "main",
                    parameters: {
                        environment: "staging",
                        deploy_region: "us-west-2",
                        run_e2e_tests: true
                    }
                });
                expect(result.success).toBe(true);
            });

            it("rejects missing projectSlug", () => {
                const result = triggerPipelineSchema.safeParse({
                    branch: "main"
                });
                expect(result.success).toBe(false);
            });

            it("rejects empty projectSlug", () => {
                const result = triggerPipelineSchema.safeParse({
                    projectSlug: "",
                    branch: "main"
                });
                expect(result.success).toBe(false);
            });
        });
    });
});
