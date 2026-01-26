import { GitLabClient } from "../client/GitLabClient";
import {
    // Project executors
    executeListProjects,
    executeGetProject,
    executeCreateProject,
    executeUpdateProject,
    executeDeleteProject,
    // Issue executors
    executeListIssues,
    executeGetIssue,
    executeCreateIssue,
    executeUpdateIssue,
    // Merge request executors
    executeListMergeRequests,
    executeGetMergeRequest,
    executeCreateMergeRequest,
    executeMergeMergeRequest,
    // Pipeline executors
    executeListPipelines,
    executeTriggerPipeline
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * GitLab MCP Adapter - wraps operations as MCP tools for agent use
 */
export class GitLabMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `gitlab_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON,
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: GitLabClient
    ): Promise<unknown> {
        // Remove "gitlab_" prefix to get operation ID
        const operationId = toolName.replace(/^gitlab_/, "");

        // Route to operation executor
        switch (operationId) {
            // Project operations
            case "listProjects":
                return await executeListProjects(client, params as never);
            case "getProject":
                return await executeGetProject(client, params as never);
            case "createProject":
                return await executeCreateProject(client, params as never);
            case "updateProject":
                return await executeUpdateProject(client, params as never);
            case "deleteProject":
                return await executeDeleteProject(client, params as never);

            // Issue operations
            case "listIssues":
                return await executeListIssues(client, params as never);
            case "getIssue":
                return await executeGetIssue(client, params as never);
            case "createIssue":
                return await executeCreateIssue(client, params as never);
            case "updateIssue":
                return await executeUpdateIssue(client, params as never);

            // Merge request operations
            case "listMergeRequests":
                return await executeListMergeRequests(client, params as never);
            case "getMergeRequest":
                return await executeGetMergeRequest(client, params as never);
            case "createMergeRequest":
                return await executeCreateMergeRequest(client, params as never);
            case "mergeMergeRequest":
                return await executeMergeMergeRequest(client, params as never);

            // Pipeline operations
            case "listPipelines":
                return await executeListPipelines(client, params as never);
            case "triggerPipeline":
                return await executeTriggerPipeline(client, params as never);

            default:
                throw new Error(`Unknown GitLab operation: ${operationId}`);
        }
    }
}
