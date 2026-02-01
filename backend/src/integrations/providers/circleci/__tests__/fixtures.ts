/**
 * CircleCI Provider Test Fixtures
 * Comprehensive test fixtures for CircleCI CI/CD operations
 */

import type { TestFixture } from "../../../sandbox";

export const circleciFixtures: TestFixture[] = [
    {
        operationId: "cancelWorkflow",
        provider: "circleci",
        validCases: [
            {
                name: "cancel_running_workflow",
                description: "Cancel a running CircleCI workflow",
                input: {
                    workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                },
                expectedOutput: {
                    workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                    message: "Workflow 5034460f-c7c4-4c43-9457-de07e2029e7b canceled successfully"
                }
            },
            {
                name: "cancel_workflow_with_pending_jobs",
                description: "Cancel a workflow that has jobs in pending state",
                input: {
                    workflowId: "a8b2c3d4-e5f6-7890-abcd-ef1234567890"
                },
                expectedOutput: {
                    workflowId: "a8b2c3d4-e5f6-7890-abcd-ef1234567890",
                    message: "Workflow a8b2c3d4-e5f6-7890-abcd-ef1234567890 canceled successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "workflow_not_found",
                description: "Attempt to cancel a non-existent workflow",
                input: {
                    workflowId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workflow not found",
                    retryable: false
                }
            },
            {
                name: "workflow_already_completed",
                description: "Attempt to cancel an already completed workflow",
                input: {
                    workflowId: "c1d2e3f4-5678-90ab-cdef-123456789abc"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot cancel a completed workflow",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when canceling workflow",
                input: {
                    workflowId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unauthorized_project_access",
                description: "User does not have permission to cancel workflows in this project",
                input: {
                    workflowId: "restricted-workflow-id-12345"
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to cancel workflow",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "getJobArtifacts",
        provider: "circleci",
        validCases: [
            {
                name: "get_test_report_artifacts",
                description: "Get test report artifacts from a completed test job",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    jobNumber: 1542
                },
                expectedOutput: {
                    artifacts: [
                        {
                            path: "test-results/junit.xml",
                            url: "https://circleci.com/gh/acme-corp/web-application/1542/artifacts/0/test-results/junit.xml",
                            nodeIndex: 0
                        },
                        {
                            path: "coverage/lcov-report/index.html",
                            url: "https://circleci.com/gh/acme-corp/web-application/1542/artifacts/0/coverage/lcov-report/index.html",
                            nodeIndex: 0
                        },
                        {
                            path: "coverage/coverage-summary.json",
                            url: "https://circleci.com/gh/acme-corp/web-application/1542/artifacts/0/coverage/coverage-summary.json",
                            nodeIndex: 0
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "get_build_artifacts",
                description: "Get build artifacts from a successful build job",
                input: {
                    projectSlug: "gh/acme-corp/backend-api",
                    jobNumber: 2891
                },
                expectedOutput: {
                    artifacts: [
                        {
                            path: "dist/backend-api-1.5.2.tar.gz",
                            url: "https://circleci.com/gh/acme-corp/backend-api/2891/artifacts/0/dist/backend-api-1.5.2.tar.gz",
                            nodeIndex: 0
                        },
                        {
                            path: "dist/backend-api-1.5.2.sha256",
                            url: "https://circleci.com/gh/acme-corp/backend-api/2891/artifacts/0/dist/backend-api-1.5.2.sha256",
                            nodeIndex: 0
                        }
                    ],
                    count: 2
                }
            },
            {
                name: "get_parallel_job_artifacts",
                description: "Get artifacts from parallel test execution across multiple nodes",
                input: {
                    projectSlug: "gh/acme-corp/monorepo",
                    jobNumber: 5678
                },
                expectedOutput: {
                    artifacts: [
                        {
                            path: "test-results/node-0/results.xml",
                            url: "https://circleci.com/gh/acme-corp/monorepo/5678/artifacts/0/test-results/node-0/results.xml",
                            nodeIndex: 0
                        },
                        {
                            path: "test-results/node-1/results.xml",
                            url: "https://circleci.com/gh/acme-corp/monorepo/5678/artifacts/1/test-results/node-1/results.xml",
                            nodeIndex: 1
                        },
                        {
                            path: "test-results/node-2/results.xml",
                            url: "https://circleci.com/gh/acme-corp/monorepo/5678/artifacts/2/test-results/node-2/results.xml",
                            nodeIndex: 2
                        },
                        {
                            path: "test-results/node-3/results.xml",
                            url: "https://circleci.com/gh/acme-corp/monorepo/5678/artifacts/3/test-results/node-3/results.xml",
                            nodeIndex: 3
                        }
                    ],
                    count: 4
                }
            },
            {
                name: "get_docker_image_artifacts",
                description: "Get Docker image scan results and metadata",
                input: {
                    projectSlug: "bb/startup-io/microservices",
                    jobNumber: 891
                },
                expectedOutput: {
                    artifacts: [
                        {
                            path: "docker/image-scan-results.json",
                            url: "https://circleci.com/bb/startup-io/microservices/891/artifacts/0/docker/image-scan-results.json",
                            nodeIndex: 0
                        },
                        {
                            path: "docker/sbom.json",
                            url: "https://circleci.com/bb/startup-io/microservices/891/artifacts/0/docker/sbom.json",
                            nodeIndex: 0
                        }
                    ],
                    count: 2
                }
            },
            {
                name: "job_with_no_artifacts",
                description: "Get artifacts from a job that produced none",
                input: {
                    projectSlug: "gh/acme-corp/simple-lib",
                    jobNumber: 234
                },
                expectedOutput: {
                    artifacts: [],
                    count: 0
                }
            }
        ],
        errorCases: [
            {
                name: "job_not_found",
                description: "Job number does not exist in the project",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    jobNumber: 999999
                },
                expectedError: {
                    type: "not_found",
                    message: "Job not found",
                    retryable: false
                }
            },
            {
                name: "project_not_found",
                description: "Project slug does not exist",
                input: {
                    projectSlug: "gh/nonexistent-org/fake-repo",
                    jobNumber: 100
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching artifacts",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    jobNumber: 1542
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "job_still_running",
                description: "Attempt to get artifacts from a job that is still running",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    jobNumber: 1600
                },
                expectedError: {
                    type: "validation",
                    message: "Job is still running, artifacts not yet available",
                    retryable: true
                }
            }
        ]
    },
    {
        operationId: "getPipeline",
        provider: "circleci",
        validCases: [
            {
                name: "get_successful_pipeline",
                description: "Get details of a successfully completed pipeline",
                input: {
                    pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                },
                expectedOutput: {
                    pipeline: {
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
                            revision: "abc123def456789012345678901234567890abcd",
                            commitSubject: "feat: Add user authentication module"
                        }
                    }
                }
            },
            {
                name: "get_tag_triggered_pipeline",
                description: "Get pipeline triggered by a git tag",
                input: {
                    pipelineId: "b2c3d4e5-f6a7-8901-bcde-f23456789012"
                },
                expectedOutput: {
                    pipeline: {
                        id: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        number: 2100,
                        projectSlug: "gh/acme-corp/backend-api",
                        state: "created",
                        createdAt: "2024-01-20T14:45:00.000Z",
                        trigger: {
                            type: "webhook",
                            actor: "releasebot"
                        },
                        vcs: {
                            tag: "v2.1.0",
                            revision: "fedcba9876543210fedcba9876543210fedcba98",
                            commitSubject: "Release v2.1.0"
                        }
                    }
                }
            },
            {
                name: "get_api_triggered_pipeline",
                description: "Get pipeline triggered via API",
                input: {
                    pipelineId: "c3d4e5f6-a789-0123-cdef-456789012345"
                },
                expectedOutput: {
                    pipeline: {
                        id: "c3d4e5f6-a789-0123-cdef-456789012345",
                        number: 3456,
                        projectSlug: "gh/acme-corp/infrastructure",
                        state: "created",
                        createdAt: "2024-01-25T08:00:00.000Z",
                        trigger: {
                            type: "api",
                            actor: "deploy-service"
                        },
                        vcs: {
                            branch: "production",
                            revision: "1234567890abcdef1234567890abcdef12345678",
                            commitSubject: "chore: Update Terraform modules"
                        }
                    }
                }
            },
            {
                name: "get_scheduled_pipeline",
                description: "Get pipeline triggered by a schedule",
                input: {
                    pipelineId: "d4e5f6a7-8901-2345-def0-123456789abc"
                },
                expectedOutput: {
                    pipeline: {
                        id: "d4e5f6a7-8901-2345-def0-123456789abc",
                        number: 4001,
                        projectSlug: "gh/acme-corp/nightly-builds",
                        state: "created",
                        createdAt: "2024-01-26T02:00:00.000Z",
                        trigger: {
                            type: "scheduled_pipeline",
                            actor: "circleci-scheduler"
                        },
                        vcs: {
                            branch: "develop",
                            revision: "abcdef1234567890abcdef1234567890abcdef12",
                            commitSubject: "fix: Resolve memory leak in cache handler"
                        }
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "pipeline_not_found",
                description: "Pipeline ID does not exist",
                input: {
                    pipelineId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Pipeline not found",
                    retryable: false
                }
            },
            {
                name: "invalid_pipeline_id_format",
                description: "Pipeline ID is not a valid UUID",
                input: {
                    pipelineId: "not-a-valid-uuid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pipeline ID format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching pipeline",
                input: {
                    pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
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
        operationId: "getWorkflow",
        provider: "circleci",
        validCases: [
            {
                name: "get_successful_workflow",
                description: "Get details of a successfully completed workflow",
                input: {
                    workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
                },
                expectedOutput: {
                    workflow: {
                        id: "e5f6a7b8-9012-3456-ef01-234567890abc",
                        name: "build-test-deploy",
                        pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                        pipelineNumber: 1542,
                        projectSlug: "gh/acme-corp/web-application",
                        status: "success",
                        startedBy: "jsmith",
                        createdAt: "2024-01-15T10:30:15.000Z",
                        stoppedAt: "2024-01-15T10:45:32.000Z"
                    }
                }
            },
            {
                name: "get_failed_workflow",
                description: "Get details of a failed workflow",
                input: {
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
                },
                expectedOutput: {
                    workflow: {
                        id: "f6a7b8c9-0123-4567-f012-345678901bcd",
                        name: "integration-tests",
                        pipelineId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
                        pipelineNumber: 2100,
                        projectSlug: "gh/acme-corp/backend-api",
                        status: "failed",
                        startedBy: "ci-bot",
                        createdAt: "2024-01-20T14:45:30.000Z",
                        stoppedAt: "2024-01-20T15:12:45.000Z"
                    }
                }
            },
            {
                name: "get_running_workflow",
                description: "Get details of a currently running workflow",
                input: {
                    workflowId: "a7b8c9d0-1234-5678-a123-456789012cde"
                },
                expectedOutput: {
                    workflow: {
                        id: "a7b8c9d0-1234-5678-a123-456789012cde",
                        name: "deploy-staging",
                        pipelineId: "c3d4e5f6-a789-0123-cdef-456789012345",
                        pipelineNumber: 3456,
                        projectSlug: "gh/acme-corp/infrastructure",
                        status: "running",
                        startedBy: "deploy-service",
                        createdAt: "2024-01-25T08:00:30.000Z"
                    }
                }
            },
            {
                name: "get_on_hold_workflow",
                description: "Get details of a workflow waiting for approval",
                input: {
                    workflowId: "b8c9d0e1-2345-6789-b234-567890123def"
                },
                expectedOutput: {
                    workflow: {
                        id: "b8c9d0e1-2345-6789-b234-567890123def",
                        name: "deploy-production",
                        pipelineId: "d4e5f6a7-8901-2345-def0-123456789abc",
                        pipelineNumber: 4001,
                        projectSlug: "gh/acme-corp/web-application",
                        status: "on_hold",
                        startedBy: "release-manager",
                        createdAt: "2024-01-26T16:30:00.000Z"
                    }
                }
            },
            {
                name: "get_canceled_workflow",
                description: "Get details of a canceled workflow",
                input: {
                    workflowId: "c9d0e1f2-3456-7890-c345-678901234ef0"
                },
                expectedOutput: {
                    workflow: {
                        id: "c9d0e1f2-3456-7890-c345-678901234ef0",
                        name: "build-and-test",
                        pipelineId: "e5f6a7b8-9012-3456-ef01-234567890abc",
                        pipelineNumber: 5002,
                        projectSlug: "gh/acme-corp/mobile-app",
                        status: "canceled",
                        startedBy: "developer123",
                        createdAt: "2024-01-27T09:15:00.000Z",
                        stoppedAt: "2024-01-27T09:18:45.000Z"
                    }
                }
            }
        ],
        errorCases: [
            {
                name: "workflow_not_found",
                description: "Workflow ID does not exist",
                input: {
                    workflowId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workflow not found",
                    retryable: false
                }
            },
            {
                name: "invalid_workflow_id_format",
                description: "Workflow ID is not a valid UUID",
                input: {
                    workflowId: "invalid-uuid-format"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid workflow ID format",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when fetching workflow",
                input: {
                    workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
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
        operationId: "listJobs",
        provider: "circleci",
        validCases: [
            {
                name: "list_jobs_successful_workflow",
                description: "List all jobs in a successfully completed workflow",
                input: {
                    workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
                },
                expectedOutput: {
                    jobs: [
                        {
                            id: "job-1-uuid-checkout",
                            name: "checkout",
                            jobNumber: 15420,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-15T10:30:15.000Z",
                            stoppedAt: "2024-01-15T10:31:02.000Z",
                            dependencies: []
                        },
                        {
                            id: "job-2-uuid-install-deps",
                            name: "install-dependencies",
                            jobNumber: 15421,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-15T10:31:05.000Z",
                            stoppedAt: "2024-01-15T10:33:45.000Z",
                            dependencies: ["job-1-uuid-checkout"]
                        },
                        {
                            id: "job-3-uuid-lint",
                            name: "lint",
                            jobNumber: 15422,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-15T10:33:48.000Z",
                            stoppedAt: "2024-01-15T10:35:12.000Z",
                            dependencies: ["job-2-uuid-install-deps"]
                        },
                        {
                            id: "job-4-uuid-unit-tests",
                            name: "unit-tests",
                            jobNumber: 15423,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-15T10:33:48.000Z",
                            stoppedAt: "2024-01-15T10:40:22.000Z",
                            dependencies: ["job-2-uuid-install-deps"]
                        },
                        {
                            id: "job-5-uuid-build",
                            name: "build",
                            jobNumber: 15424,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-15T10:40:25.000Z",
                            stoppedAt: "2024-01-15T10:43:18.000Z",
                            dependencies: ["job-3-uuid-lint", "job-4-uuid-unit-tests"]
                        },
                        {
                            id: "job-6-uuid-deploy",
                            name: "deploy-staging",
                            jobNumber: 15425,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            type: "deploy",
                            startedAt: "2024-01-15T10:43:21.000Z",
                            stoppedAt: "2024-01-15T10:45:32.000Z",
                            dependencies: ["job-5-uuid-build"]
                        }
                    ],
                    count: 6
                }
            },
            {
                name: "list_jobs_failed_workflow",
                description: "List jobs in a workflow where one job failed",
                input: {
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
                },
                expectedOutput: {
                    jobs: [
                        {
                            id: "job-a-uuid-setup",
                            name: "setup",
                            jobNumber: 21000,
                            projectSlug: "gh/acme-corp/backend-api",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-20T14:45:30.000Z",
                            stoppedAt: "2024-01-20T14:46:15.000Z",
                            dependencies: []
                        },
                        {
                            id: "job-b-uuid-integration",
                            name: "integration-tests",
                            jobNumber: 21001,
                            projectSlug: "gh/acme-corp/backend-api",
                            status: "failed",
                            type: "build",
                            startedAt: "2024-01-20T14:46:18.000Z",
                            stoppedAt: "2024-01-20T15:12:45.000Z",
                            dependencies: ["job-a-uuid-setup"]
                        },
                        {
                            id: "job-c-uuid-deploy",
                            name: "deploy",
                            projectSlug: "gh/acme-corp/backend-api",
                            status: "blocked",
                            type: "deploy",
                            dependencies: ["job-b-uuid-integration"]
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "list_jobs_with_approval",
                description: "List jobs in a workflow with a manual approval step",
                input: {
                    workflowId: "b8c9d0e1-2345-6789-b234-567890123def"
                },
                expectedOutput: {
                    jobs: [
                        {
                            id: "job-x-uuid-build",
                            name: "build",
                            jobNumber: 40010,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-26T16:30:00.000Z",
                            stoppedAt: "2024-01-26T16:35:45.000Z",
                            dependencies: []
                        },
                        {
                            id: "job-y-uuid-approve",
                            name: "approve-production-deploy",
                            projectSlug: "gh/acme-corp/web-application",
                            status: "on_hold",
                            type: "approval",
                            dependencies: ["job-x-uuid-build"]
                        },
                        {
                            id: "job-z-uuid-deploy-prod",
                            name: "deploy-production",
                            projectSlug: "gh/acme-corp/web-application",
                            status: "blocked",
                            type: "deploy",
                            dependencies: ["job-y-uuid-approve"]
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "list_parallel_test_jobs",
                description: "List jobs in a workflow with parallel test execution",
                input: {
                    workflowId: "parallel-tests-workflow-uuid"
                },
                expectedOutput: {
                    jobs: [
                        {
                            id: "job-p0-checkout",
                            name: "checkout",
                            jobNumber: 50001,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-27T12:00:00.000Z",
                            stoppedAt: "2024-01-27T12:00:45.000Z",
                            dependencies: []
                        },
                        {
                            id: "job-p1-test-shard-1",
                            name: "test-shard-1",
                            jobNumber: 50002,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-27T12:00:48.000Z",
                            stoppedAt: "2024-01-27T12:08:22.000Z",
                            dependencies: ["job-p0-checkout"]
                        },
                        {
                            id: "job-p2-test-shard-2",
                            name: "test-shard-2",
                            jobNumber: 50003,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-27T12:00:48.000Z",
                            stoppedAt: "2024-01-27T12:07:55.000Z",
                            dependencies: ["job-p0-checkout"]
                        },
                        {
                            id: "job-p3-test-shard-3",
                            name: "test-shard-3",
                            jobNumber: 50004,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-27T12:00:48.000Z",
                            stoppedAt: "2024-01-27T12:09:10.000Z",
                            dependencies: ["job-p0-checkout"]
                        },
                        {
                            id: "job-p4-merge-results",
                            name: "merge-test-results",
                            jobNumber: 50005,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            type: "build",
                            startedAt: "2024-01-27T12:09:15.000Z",
                            stoppedAt: "2024-01-27T12:09:45.000Z",
                            dependencies: [
                                "job-p1-test-shard-1",
                                "job-p2-test-shard-2",
                                "job-p3-test-shard-3"
                            ]
                        }
                    ],
                    count: 5
                }
            }
        ],
        errorCases: [
            {
                name: "workflow_not_found",
                description: "Workflow ID does not exist",
                input: {
                    workflowId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workflow not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing jobs",
                input: {
                    workflowId: "e5f6a7b8-9012-3456-ef01-234567890abc"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unauthorized_workflow_access",
                description: "User does not have permission to view this workflow",
                input: {
                    workflowId: "restricted-workflow-uuid-12345"
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to view workflow jobs",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listPipelines",
        provider: "circleci",
        validCases: [
            {
                name: "list_all_pipelines",
                description: "List all recent pipelines for a project",
                input: {
                    projectSlug: "gh/acme-corp/web-application"
                },
                expectedOutput: {
                    pipelines: [
                        {
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
                                revision: "abc123def456789012345678901234567890abcd",
                                commitSubject: "feat: Add user dashboard analytics"
                            }
                        },
                        {
                            id: "6145571g-d8d5-5d54-a568-ef18e3130e8c",
                            number: 1544,
                            projectSlug: "gh/acme-corp/web-application",
                            state: "created",
                            createdAt: "2024-01-28T12:15:00.000Z",
                            trigger: {
                                type: "webhook",
                                actor: "developer2"
                            },
                            vcs: {
                                branch: "main",
                                revision: "def456abc789012345678901234567890defabc",
                                commitSubject: "fix: Resolve login timeout issue"
                            }
                        },
                        {
                            id: "7256682h-e9e6-6e65-b679-fg29f4241f9d",
                            number: 1543,
                            projectSlug: "gh/acme-corp/web-application",
                            state: "created",
                            createdAt: "2024-01-28T09:00:00.000Z",
                            trigger: {
                                type: "scheduled_pipeline",
                                actor: "circleci-scheduler"
                            },
                            vcs: {
                                branch: "develop",
                                revision: "ghi789jkl012345678901234567890ghijkl01",
                                commitSubject: "chore: Merge develop into main"
                            }
                        }
                    ],
                    count: 3
                }
            },
            {
                name: "list_pipelines_by_branch",
                description: "List pipelines filtered by branch name",
                input: {
                    projectSlug: "gh/acme-corp/backend-api",
                    branch: "main"
                },
                expectedOutput: {
                    pipelines: [
                        {
                            id: "main-pipeline-uuid-001",
                            number: 890,
                            projectSlug: "gh/acme-corp/backend-api",
                            state: "created",
                            createdAt: "2024-01-28T16:00:00.000Z",
                            trigger: {
                                type: "webhook",
                                actor: "lead-developer"
                            },
                            vcs: {
                                branch: "main",
                                revision: "mainbranch1234567890abcdef1234567890abc",
                                commitSubject: "Merge PR #456: Add rate limiting"
                            }
                        },
                        {
                            id: "main-pipeline-uuid-002",
                            number: 885,
                            projectSlug: "gh/acme-corp/backend-api",
                            state: "created",
                            createdAt: "2024-01-27T11:30:00.000Z",
                            trigger: {
                                type: "webhook",
                                actor: "senior-dev"
                            },
                            vcs: {
                                branch: "main",
                                revision: "mainbranch0987654321fedcba0987654321fed",
                                commitSubject: "Merge PR #455: Database optimization"
                            }
                        }
                    ],
                    count: 2
                }
            },
            {
                name: "list_pipelines_bitbucket_project",
                description: "List pipelines for a Bitbucket project",
                input: {
                    projectSlug: "bb/startup-io/microservices"
                },
                expectedOutput: {
                    pipelines: [
                        {
                            id: "bb-pipeline-uuid-001",
                            number: 234,
                            projectSlug: "bb/startup-io/microservices",
                            state: "created",
                            createdAt: "2024-01-28T10:00:00.000Z",
                            trigger: {
                                type: "webhook",
                                actor: "bb-developer"
                            },
                            vcs: {
                                branch: "feature/api-v2",
                                revision: "bbrevision123456789012345678901234567890",
                                commitSubject: "feat: Implement API v2 endpoints"
                            }
                        }
                    ],
                    count: 1
                }
            },
            {
                name: "list_pipelines_empty_result",
                description: "List pipelines for a project with no recent pipelines",
                input: {
                    projectSlug: "gh/acme-corp/archived-project",
                    branch: "legacy"
                },
                expectedOutput: {
                    pipelines: [],
                    count: 0
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project slug does not exist",
                input: {
                    projectSlug: "gh/nonexistent-org/fake-repo"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "invalid_project_slug_format",
                description: "Project slug format is invalid",
                input: {
                    projectSlug: "invalid-format"
                },
                expectedError: {
                    type: "validation",
                    message:
                        "Invalid project slug format. Expected format: vcs-type/org-name/repo-name",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing pipelines",
                input: {
                    projectSlug: "gh/acme-corp/web-application"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unauthorized_project_access",
                description: "User does not have permission to view this project",
                input: {
                    projectSlug: "gh/private-org/secret-repo"
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to view project pipelines",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "listWorkflows",
        provider: "circleci",
        validCases: [
            {
                name: "list_single_workflow_pipeline",
                description: "List workflows in a pipeline with a single workflow",
                input: {
                    pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                },
                expectedOutput: {
                    workflows: [
                        {
                            id: "e5f6a7b8-9012-3456-ef01-234567890abc",
                            name: "build-test-deploy",
                            pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b",
                            pipelineNumber: 1542,
                            projectSlug: "gh/acme-corp/web-application",
                            status: "success",
                            startedBy: "jsmith",
                            createdAt: "2024-01-15T10:30:15.000Z",
                            stoppedAt: "2024-01-15T10:45:32.000Z"
                        }
                    ],
                    count: 1
                }
            },
            {
                name: "list_multiple_workflows_pipeline",
                description: "List workflows in a pipeline with multiple workflows",
                input: {
                    pipelineId: "multi-workflow-pipeline-uuid"
                },
                expectedOutput: {
                    workflows: [
                        {
                            id: "workflow-build-uuid",
                            name: "build",
                            pipelineId: "multi-workflow-pipeline-uuid",
                            pipelineNumber: 3000,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            startedBy: "monorepo-dev",
                            createdAt: "2024-01-28T08:00:00.000Z",
                            stoppedAt: "2024-01-28T08:15:00.000Z"
                        },
                        {
                            id: "workflow-test-uuid",
                            name: "test",
                            pipelineId: "multi-workflow-pipeline-uuid",
                            pipelineNumber: 3000,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            startedBy: "monorepo-dev",
                            createdAt: "2024-01-28T08:00:00.000Z",
                            stoppedAt: "2024-01-28T08:25:00.000Z"
                        },
                        {
                            id: "workflow-deploy-staging-uuid",
                            name: "deploy-staging",
                            pipelineId: "multi-workflow-pipeline-uuid",
                            pipelineNumber: 3000,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "success",
                            startedBy: "monorepo-dev",
                            createdAt: "2024-01-28T08:25:05.000Z",
                            stoppedAt: "2024-01-28T08:30:00.000Z"
                        },
                        {
                            id: "workflow-deploy-prod-uuid",
                            name: "deploy-production",
                            pipelineId: "multi-workflow-pipeline-uuid",
                            pipelineNumber: 3000,
                            projectSlug: "gh/acme-corp/monorepo",
                            status: "on_hold",
                            startedBy: "monorepo-dev",
                            createdAt: "2024-01-28T08:30:05.000Z"
                        }
                    ],
                    count: 4
                }
            },
            {
                name: "list_workflows_with_failures",
                description: "List workflows where some have failed",
                input: {
                    pipelineId: "failed-pipeline-uuid"
                },
                expectedOutput: {
                    workflows: [
                        {
                            id: "workflow-lint-failed-uuid",
                            name: "lint",
                            pipelineId: "failed-pipeline-uuid",
                            pipelineNumber: 4500,
                            projectSlug: "gh/acme-corp/backend-api",
                            status: "failed",
                            startedBy: "junior-dev",
                            createdAt: "2024-01-28T14:00:00.000Z",
                            stoppedAt: "2024-01-28T14:02:30.000Z"
                        },
                        {
                            id: "workflow-test-canceled-uuid",
                            name: "test",
                            pipelineId: "failed-pipeline-uuid",
                            pipelineNumber: 4500,
                            projectSlug: "gh/acme-corp/backend-api",
                            status: "canceled",
                            startedBy: "junior-dev",
                            createdAt: "2024-01-28T14:00:00.000Z",
                            stoppedAt: "2024-01-28T14:02:35.000Z"
                        }
                    ],
                    count: 2
                }
            }
        ],
        errorCases: [
            {
                name: "pipeline_not_found",
                description: "Pipeline ID does not exist",
                input: {
                    pipelineId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Pipeline not found",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when listing workflows",
                input: {
                    pipelineId: "5034460f-c7c4-4c43-9457-de07e2029e7b"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "invalid_pipeline_id",
                description: "Pipeline ID format is invalid",
                input: {
                    pipelineId: "not-a-uuid"
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pipeline ID format",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "rerunWorkflow",
        provider: "circleci",
        validCases: [
            {
                name: "rerun_entire_workflow",
                description: "Rerun a workflow from the beginning",
                input: {
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
                },
                expectedOutput: {
                    originalWorkflowId: "f6a7b8c9-0123-4567-f012-345678901bcd",
                    newWorkflowId: "new-workflow-uuid-rerun-001",
                    message:
                        "Workflow rerun triggered. New workflow ID: new-workflow-uuid-rerun-001"
                }
            },
            {
                name: "rerun_from_failed_jobs",
                description: "Rerun a workflow starting only from failed jobs",
                input: {
                    workflowId: "failed-workflow-uuid-12345",
                    fromFailed: true
                },
                expectedOutput: {
                    originalWorkflowId: "failed-workflow-uuid-12345",
                    newWorkflowId: "new-workflow-uuid-from-failed",
                    message:
                        "Workflow rerun triggered. New workflow ID: new-workflow-uuid-from-failed"
                }
            },
            {
                name: "rerun_with_ssh_debugging",
                description: "Rerun a workflow with SSH access enabled for debugging",
                input: {
                    workflowId: "debug-workflow-uuid-67890",
                    enableSsh: true
                },
                expectedOutput: {
                    originalWorkflowId: "debug-workflow-uuid-67890",
                    newWorkflowId: "new-workflow-uuid-with-ssh",
                    message: "Workflow rerun triggered. New workflow ID: new-workflow-uuid-with-ssh"
                }
            },
            {
                name: "rerun_specific_jobs",
                description: "Rerun only specific jobs in the workflow",
                input: {
                    workflowId: "selective-rerun-workflow-uuid",
                    jobs: ["job-3-uuid-lint", "job-4-uuid-unit-tests"],
                    sparseTree: true
                },
                expectedOutput: {
                    originalWorkflowId: "selective-rerun-workflow-uuid",
                    newWorkflowId: "new-workflow-uuid-specific-jobs",
                    message:
                        "Workflow rerun triggered. New workflow ID: new-workflow-uuid-specific-jobs"
                }
            },
            {
                name: "rerun_failed_with_ssh",
                description: "Rerun from failed jobs with SSH enabled for investigation",
                input: {
                    workflowId: "investigate-failure-workflow-uuid",
                    fromFailed: true,
                    enableSsh: true
                },
                expectedOutput: {
                    originalWorkflowId: "investigate-failure-workflow-uuid",
                    newWorkflowId: "new-workflow-uuid-debug-failed",
                    message:
                        "Workflow rerun triggered. New workflow ID: new-workflow-uuid-debug-failed"
                }
            }
        ],
        errorCases: [
            {
                name: "workflow_not_found",
                description: "Workflow ID does not exist",
                input: {
                    workflowId: "00000000-0000-0000-0000-000000000000"
                },
                expectedError: {
                    type: "not_found",
                    message: "Workflow not found",
                    retryable: false
                }
            },
            {
                name: "workflow_still_running",
                description: "Cannot rerun a workflow that is still running",
                input: {
                    workflowId: "running-workflow-uuid-active"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot rerun a workflow that is still running",
                    retryable: false
                }
            },
            {
                name: "no_failed_jobs_to_rerun",
                description: "Attempt to rerun from failed but no jobs failed",
                input: {
                    workflowId: "successful-workflow-uuid",
                    fromFailed: true
                },
                expectedError: {
                    type: "validation",
                    message: "No failed jobs to rerun in this workflow",
                    retryable: false
                }
            },
            {
                name: "invalid_job_ids",
                description: "Specified job IDs do not exist in the workflow",
                input: {
                    workflowId: "valid-workflow-uuid",
                    jobs: ["nonexistent-job-id-1", "nonexistent-job-id-2"],
                    sparseTree: true
                },
                expectedError: {
                    type: "validation",
                    message: "One or more specified job IDs do not exist in the workflow",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when rerunning workflow",
                input: {
                    workflowId: "f6a7b8c9-0123-4567-f012-345678901bcd"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "unauthorized_rerun",
                description: "User does not have permission to rerun workflows",
                input: {
                    workflowId: "restricted-workflow-uuid"
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to rerun workflow",
                    retryable: false
                }
            }
        ]
    },
    {
        operationId: "triggerPipeline",
        provider: "circleci",
        validCases: [
            {
                name: "trigger_pipeline_on_branch",
                description: "Trigger a new pipeline on a specific branch",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    branch: "main"
                },
                expectedOutput: {
                    pipeline: {
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
                            revision: "latestcommit1234567890abcdef12345678",
                            commitSubject: "Latest commit on main"
                        }
                    },
                    message: "Pipeline 1550 triggered successfully"
                }
            },
            {
                name: "trigger_pipeline_on_tag",
                description: "Trigger a new pipeline for a specific tag",
                input: {
                    projectSlug: "gh/acme-corp/backend-api",
                    tag: "v3.0.0"
                },
                expectedOutput: {
                    pipeline: {
                        id: "triggered-pipeline-uuid-002",
                        number: 900,
                        projectSlug: "gh/acme-corp/backend-api",
                        state: "pending",
                        createdAt: "2024-01-28T18:30:00.000Z",
                        trigger: {
                            type: "api",
                            actor: "release-manager"
                        },
                        vcs: {
                            tag: "v3.0.0",
                            revision: "taggedcommit0987654321fedcba09876543",
                            commitSubject: "Release v3.0.0"
                        }
                    },
                    message: "Pipeline 900 triggered successfully"
                }
            },
            {
                name: "trigger_pipeline_with_parameters",
                description: "Trigger a pipeline with custom parameters",
                input: {
                    projectSlug: "gh/acme-corp/infrastructure",
                    branch: "main",
                    parameters: {
                        environment: "staging",
                        deploy_region: "us-west-2",
                        run_e2e_tests: true,
                        terraform_action: "apply"
                    }
                },
                expectedOutput: {
                    pipeline: {
                        id: "triggered-pipeline-uuid-003",
                        number: 5500,
                        projectSlug: "gh/acme-corp/infrastructure",
                        state: "pending",
                        createdAt: "2024-01-28T19:00:00.000Z",
                        trigger: {
                            type: "api",
                            actor: "deploy-service"
                        },
                        vcs: {
                            branch: "main",
                            revision: "infracommit5678901234abcdef567890123",
                            commitSubject: "Infrastructure update"
                        }
                    },
                    message: "Pipeline 5500 triggered successfully"
                }
            },
            {
                name: "trigger_pipeline_feature_branch",
                description: "Trigger a pipeline on a feature branch for testing",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    branch: "feature/new-checkout-flow"
                },
                expectedOutput: {
                    pipeline: {
                        id: "triggered-pipeline-uuid-004",
                        number: 1551,
                        projectSlug: "gh/acme-corp/web-application",
                        state: "pending",
                        createdAt: "2024-01-28T19:30:00.000Z",
                        trigger: {
                            type: "api",
                            actor: "developer"
                        },
                        vcs: {
                            branch: "feature/new-checkout-flow",
                            revision: "featurecommit2468013579abcdef24680135",
                            commitSubject: "feat: Implement new checkout flow"
                        }
                    },
                    message: "Pipeline 1551 triggered successfully"
                }
            },
            {
                name: "trigger_bitbucket_pipeline",
                description: "Trigger a pipeline for a Bitbucket project",
                input: {
                    projectSlug: "bb/startup-io/microservices",
                    branch: "develop"
                },
                expectedOutput: {
                    pipeline: {
                        id: "triggered-pipeline-uuid-005",
                        number: 240,
                        projectSlug: "bb/startup-io/microservices",
                        state: "pending",
                        createdAt: "2024-01-28T20:00:00.000Z",
                        trigger: {
                            type: "api",
                            actor: "bb-api-user"
                        },
                        vcs: {
                            branch: "develop",
                            revision: "bbdevelopcommit1357924680abcdef135792",
                            commitSubject: "Development updates"
                        }
                    },
                    message: "Pipeline 240 triggered successfully"
                }
            }
        ],
        errorCases: [
            {
                name: "project_not_found",
                description: "Project slug does not exist",
                input: {
                    projectSlug: "gh/nonexistent-org/fake-repo",
                    branch: "main"
                },
                expectedError: {
                    type: "not_found",
                    message: "Project not found",
                    retryable: false
                }
            },
            {
                name: "branch_not_found",
                description: "Specified branch does not exist in the repository",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    branch: "nonexistent-branch"
                },
                expectedError: {
                    type: "not_found",
                    message: "Branch not found",
                    retryable: false
                }
            },
            {
                name: "tag_not_found",
                description: "Specified tag does not exist in the repository",
                input: {
                    projectSlug: "gh/acme-corp/backend-api",
                    tag: "v99.99.99"
                },
                expectedError: {
                    type: "not_found",
                    message: "Tag not found",
                    retryable: false
                }
            },
            {
                name: "branch_and_tag_both_specified",
                description: "Cannot specify both branch and tag",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    branch: "main",
                    tag: "v1.0.0"
                },
                expectedError: {
                    type: "validation",
                    message: "Cannot specify both branch and tag. They are mutually exclusive.",
                    retryable: false
                }
            },
            {
                name: "invalid_parameters",
                description: "Pipeline parameters contain invalid values",
                input: {
                    projectSlug: "gh/acme-corp/infrastructure",
                    branch: "main",
                    parameters: {
                        environment: "invalid-env",
                        deploy_region: 12345
                    }
                },
                expectedError: {
                    type: "validation",
                    message: "Invalid pipeline parameters",
                    retryable: false
                }
            },
            {
                name: "rate_limited",
                description: "Rate limit exceeded when triggering pipeline",
                input: {
                    projectSlug: "gh/acme-corp/web-application",
                    branch: "main"
                },
                expectedError: {
                    type: "rate_limit",
                    message: "Rate limit exceeded",
                    retryable: true
                }
            },
            {
                name: "no_config_found",
                description: "No .circleci/config.yml found in the repository",
                input: {
                    projectSlug: "gh/acme-corp/no-ci-config-repo",
                    branch: "main"
                },
                expectedError: {
                    type: "validation",
                    message: "No CircleCI configuration found in repository",
                    retryable: false
                }
            },
            {
                name: "unauthorized_trigger",
                description: "User does not have permission to trigger pipelines",
                input: {
                    projectSlug: "gh/restricted-org/private-repo",
                    branch: "main"
                },
                expectedError: {
                    type: "permission",
                    message: "Insufficient permissions to trigger pipeline",
                    retryable: false
                }
            }
        ]
    }
];
