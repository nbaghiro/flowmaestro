import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { GitHubClient } from "../client/GitHubClient";
import {
    // Repository executors
    executeListRepositories,
    executeGetRepository,
    executeCreateRepository,
    executeUpdateRepository,
    executeDeleteRepository,
    // Issue executors
    executeListIssues,
    executeGetIssue,
    executeCreateIssue,
    executeUpdateIssue,
    executeAddComment,
    executeCloseIssue,
    executeReopenIssue,
    // Pull request executors
    executeListPullRequests,
    executeGetPullRequest,
    executeCreatePullRequest,
    executeUpdatePullRequest,
    executeMergePullRequest,
    executeCreateReview,
    executeAddReviewComment,
    // Workflow executors
    executeListWorkflows,
    executeGetWorkflow,
    executeTriggerWorkflow,
    executeListWorkflowRuns,
    executeGetWorkflowRun,
    executeGetWorkflowLogs,
    executeCancelWorkflowRun
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * GitHub MCP Adapter - wraps operations as MCP tools for agent use
 */
export class GitHubMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `github_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: GitHubClient
    ): Promise<unknown> {
        // Remove "github_" prefix to get operation ID
        const operationId = toolName.replace(/^github_/, "");

        // Route to operation executor
        switch (operationId) {
            // Repository operations
            case "listRepositories":
                return await executeListRepositories(client, params as never);
            case "getRepository":
                return await executeGetRepository(client, params as never);
            case "createRepository":
                return await executeCreateRepository(client, params as never);
            case "updateRepository":
                return await executeUpdateRepository(client, params as never);
            case "deleteRepository":
                return await executeDeleteRepository(client, params as never);

            // Issue operations
            case "listIssues":
                return await executeListIssues(client, params as never);
            case "getIssue":
                return await executeGetIssue(client, params as never);
            case "createIssue":
                return await executeCreateIssue(client, params as never);
            case "updateIssue":
                return await executeUpdateIssue(client, params as never);
            case "addComment":
                return await executeAddComment(client, params as never);
            case "closeIssue":
                return await executeCloseIssue(client, params as never);
            case "reopenIssue":
                return await executeReopenIssue(client, params as never);

            // Pull request operations
            case "listPullRequests":
                return await executeListPullRequests(client, params as never);
            case "getPullRequest":
                return await executeGetPullRequest(client, params as never);
            case "createPullRequest":
                return await executeCreatePullRequest(client, params as never);
            case "updatePullRequest":
                return await executeUpdatePullRequest(client, params as never);
            case "mergePullRequest":
                return await executeMergePullRequest(client, params as never);
            case "createReview":
                return await executeCreateReview(client, params as never);
            case "addReviewComment":
                return await executeAddReviewComment(client, params as never);

            // Workflow operations
            case "listWorkflows":
                return await executeListWorkflows(client, params as never);
            case "getWorkflow":
                return await executeGetWorkflow(client, params as never);
            case "triggerWorkflow":
                return await executeTriggerWorkflow(client, params as never);
            case "listWorkflowRuns":
                return await executeListWorkflowRuns(client, params as never);
            case "getWorkflowRun":
                return await executeGetWorkflowRun(client, params as never);
            case "getWorkflowLogs":
                return await executeGetWorkflowLogs(client, params as never);
            case "cancelWorkflowRun":
                return await executeCancelWorkflowRun(client, params as never);

            default:
                throw new Error(`Unknown GitHub operation: ${operationId}`);
        }
    }
}
