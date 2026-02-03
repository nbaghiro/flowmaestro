import type { TestFixture } from "../../../sandbox";

// Work Items fixtures (10)
const workItemsFixtures: TestFixture[] = [
    {
        operationId: "work_items_list",
        provider: "azure-devops",
        validCases: [
            { name: "list", input: { project: "MyProject" }, expectedOutput: { workItems: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_get",
        provider: "azure-devops",
        validCases: [
            {
                name: "get",
                input: { project: "MyProject", workItemId: 123 },
                expectedOutput: { id: 123 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_create",
        provider: "azure-devops",
        validCases: [
            {
                name: "create",
                input: { project: "MyProject", type: "Task", title: "New Task" },
                expectedOutput: { id: 124, title: "New Task" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_update",
        provider: "azure-devops",
        validCases: [
            {
                name: "update",
                input: { project: "MyProject", workItemId: 123, title: "Updated Title" },
                expectedOutput: { id: 123 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_delete",
        provider: "azure-devops",
        validCases: [
            {
                name: "delete",
                input: { project: "MyProject", workItemId: 123 },
                expectedOutput: { message: "Work item deleted" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_addComment",
        provider: "azure-devops",
        validCases: [
            {
                name: "add_comment",
                input: { project: "MyProject", workItemId: 123, text: "Great work!" },
                expectedOutput: { commentId: 1 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_listComments",
        provider: "azure-devops",
        validCases: [
            {
                name: "list_comments",
                input: { project: "MyProject", workItemId: 123 },
                expectedOutput: { comments: [] }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_addAttachment",
        provider: "azure-devops",
        validCases: [
            {
                name: "add_attachment",
                input: {
                    project: "MyProject",
                    workItemId: 123,
                    fileName: "doc.pdf",
                    content: "base64..."
                },
                expectedOutput: { fileName: "doc.pdf" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_link",
        provider: "azure-devops",
        validCases: [
            {
                name: "link",
                input: {
                    project: "MyProject",
                    sourceWorkItemId: 123,
                    targetWorkItemId: 124,
                    linkType: "Related"
                },
                expectedOutput: { sourceWorkItemId: 123, targetWorkItemId: 124 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "work_items_getHistory",
        provider: "azure-devops",
        validCases: [
            {
                name: "get_history",
                input: { project: "MyProject", workItemId: 123 },
                expectedOutput: { revisions: [] }
            }
        ],
        errorCases: []
    }
];

// Repositories fixtures (7)
const repositoriesFixtures: TestFixture[] = [
    {
        operationId: "repositories_list",
        provider: "azure-devops",
        validCases: [
            { name: "list", input: { project: "MyProject" }, expectedOutput: { repositories: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "repositories_get",
        provider: "azure-devops",
        validCases: [
            {
                name: "get",
                input: { project: "MyProject", repositoryId: "repo-id" },
                expectedOutput: { id: "repo-id" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "repositories_create",
        provider: "azure-devops",
        validCases: [
            {
                name: "create",
                input: { project: "MyProject", name: "new-repo" },
                expectedOutput: { name: "new-repo" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "repositories_listBranches",
        provider: "azure-devops",
        validCases: [
            {
                name: "list_branches",
                input: { project: "MyProject", repositoryId: "repo-id" },
                expectedOutput: { branches: [] }
            }
        ],
        errorCases: []
    },
    {
        operationId: "repositories_createPullRequest",
        provider: "azure-devops",
        validCases: [
            {
                name: "create_pr",
                input: {
                    project: "MyProject",
                    repositoryId: "repo-id",
                    title: "New PR",
                    sourceBranch: "feature",
                    targetBranch: "main"
                },
                expectedOutput: { pullRequestId: 1 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "repositories_updatePullRequest",
        provider: "azure-devops",
        validCases: [
            {
                name: "update_pr",
                input: {
                    project: "MyProject",
                    repositoryId: "repo-id",
                    pullRequestId: 1,
                    status: "completed"
                },
                expectedOutput: { pullRequestId: 1 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "repositories_getPullRequest",
        provider: "azure-devops",
        validCases: [
            {
                name: "get_pr",
                input: { project: "MyProject", repositoryId: "repo-id", pullRequestId: 1 },
                expectedOutput: { pullRequestId: 1 }
            }
        ],
        errorCases: []
    }
];

// Pipelines fixtures (10)
const pipelinesFixtures: TestFixture[] = [
    {
        operationId: "pipelines_list",
        provider: "azure-devops",
        validCases: [
            { name: "list", input: { project: "MyProject" }, expectedOutput: { pipelines: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_get",
        provider: "azure-devops",
        validCases: [
            {
                name: "get",
                input: { project: "MyProject", pipelineId: 1 },
                expectedOutput: { id: 1 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_run",
        provider: "azure-devops",
        validCases: [
            {
                name: "run",
                input: { project: "MyProject", pipelineId: 1 },
                expectedOutput: { runId: 123 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_listRuns",
        provider: "azure-devops",
        validCases: [
            {
                name: "list_runs",
                input: { project: "MyProject", pipelineId: 1 },
                expectedOutput: { runs: [] }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_getRun",
        provider: "azure-devops",
        validCases: [
            {
                name: "get_run",
                input: { project: "MyProject", pipelineId: 1, runId: 123 },
                expectedOutput: { id: 123 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_cancelRun",
        provider: "azure-devops",
        validCases: [
            {
                name: "cancel",
                input: { project: "MyProject", pipelineId: 1, runId: 123 },
                expectedOutput: { message: "Pipeline run cancelled" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_listVariableGroups",
        provider: "azure-devops",
        validCases: [
            {
                name: "list_var_groups",
                input: { project: "MyProject" },
                expectedOutput: { variableGroups: [] }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_createVariableGroup",
        provider: "azure-devops",
        validCases: [
            {
                name: "create_var_group",
                input: { project: "MyProject", name: "MyVars", variables: { KEY: "value" } },
                expectedOutput: { name: "MyVars" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_updateVariableGroup",
        provider: "azure-devops",
        validCases: [
            {
                name: "update_var_group",
                input: { project: "MyProject", groupId: 1, variables: { KEY: "newvalue" } },
                expectedOutput: { id: 1 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "pipelines_approveGate",
        provider: "azure-devops",
        validCases: [
            {
                name: "approve",
                input: { project: "MyProject", approvalId: "approval-123" },
                expectedOutput: { message: "Approved" }
            }
        ],
        errorCases: []
    }
];

// Releases fixtures (4)
const releasesFixtures: TestFixture[] = [
    {
        operationId: "releases_list",
        provider: "azure-devops",
        validCases: [
            { name: "list", input: { project: "MyProject" }, expectedOutput: { releases: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "releases_create",
        provider: "azure-devops",
        validCases: [
            {
                name: "create",
                input: { project: "MyProject", definitionId: 1 },
                expectedOutput: { id: 123 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "releases_getStatus",
        provider: "azure-devops",
        validCases: [
            {
                name: "get_status",
                input: { project: "MyProject", releaseId: 123 },
                expectedOutput: { id: 123, status: "active" }
            }
        ],
        errorCases: []
    },
    {
        operationId: "releases_approve",
        provider: "azure-devops",
        validCases: [
            {
                name: "approve",
                input: { project: "MyProject", approvalId: 1 },
                expectedOutput: { message: "Approved" }
            }
        ],
        errorCases: []
    }
];

// Test Plans fixtures (4)
const testPlansFixtures: TestFixture[] = [
    {
        operationId: "testPlans_list",
        provider: "azure-devops",
        validCases: [
            { name: "list", input: { project: "MyProject" }, expectedOutput: { testPlans: [] } }
        ],
        errorCases: []
    },
    {
        operationId: "testPlans_get",
        provider: "azure-devops",
        validCases: [
            { name: "get", input: { project: "MyProject", planId: 1 }, expectedOutput: { id: 1 } }
        ],
        errorCases: []
    },
    {
        operationId: "testPlans_createRun",
        provider: "azure-devops",
        validCases: [
            {
                name: "create_run",
                input: {
                    project: "MyProject",
                    name: "Test Run 1",
                    planId: 1,
                    testCaseIds: [1, 2, 3]
                },
                expectedOutput: { id: 123 }
            }
        ],
        errorCases: []
    },
    {
        operationId: "testPlans_updateResults",
        provider: "azure-devops",
        validCases: [
            {
                name: "update_results",
                input: {
                    project: "MyProject",
                    runId: 123,
                    results: [{ testCaseId: 1, outcome: "Passed" }]
                },
                expectedOutput: { count: 1 }
            }
        ],
        errorCases: []
    }
];

export const azureDevOpsFixtures: TestFixture[] = [
    ...workItemsFixtures,
    ...repositoriesFixtures,
    ...pipelinesFixtures,
    ...releasesFixtures,
    ...testPlansFixtures
];
