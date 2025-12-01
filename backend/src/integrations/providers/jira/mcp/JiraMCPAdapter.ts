import {
    executeCreateIssue,
    executeGetIssue,
    executeUpdateIssue,
    executeSearchIssues,
    executeDeleteIssue,
    executeTransitionIssue,
    executeAssignIssue,
    executeAddComment,
    executeGetComments,
    executeAddAttachment,
    executeLinkIssues,
    executeListProjects,
    executeGetProject,
    executeGetIssueTypes,
    executeListFields,
    executeGetCustomFieldConfigs,
    executeSearchUsers,
    executeGetCurrentUser
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { JiraClient } from "../client/JiraClient";

/**
 * Jira MCP Adapter
 * Wraps Jira operations as MCP tools for AI agents
 */
export class JiraMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `jira_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: JiraClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace(/^jira_/, "");
        const operation = this.operations.get(operationId);

        if (!operation) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Unknown MCP tool: ${toolName}`,
                    retryable: false
                }
            };
        }

        // Execute the appropriate operation
        switch (operationId) {
            case "createIssue":
                return await executeCreateIssue(client, params as never);
            case "getIssue":
                return await executeGetIssue(client, params as never);
            case "updateIssue":
                return await executeUpdateIssue(client, params as never);
            case "searchIssues":
                return await executeSearchIssues(client, params as never);
            case "deleteIssue":
                return await executeDeleteIssue(client, params as never);
            case "transitionIssue":
                return await executeTransitionIssue(client, params as never);
            case "assignIssue":
                return await executeAssignIssue(client, params as never);
            case "addComment":
                return await executeAddComment(client, params as never);
            case "getComments":
                return await executeGetComments(client, params as never);
            case "addAttachment":
                return await executeAddAttachment(client, params as never);
            case "linkIssues":
                return await executeLinkIssues(client, params as never);
            case "listProjects":
                return await executeListProjects(client, params as never);
            case "getProject":
                return await executeGetProject(client, params as never);
            case "getIssueTypes":
                return await executeGetIssueTypes(client, params as never);
            case "listFields":
                return await executeListFields(client, params as never);
            case "getCustomFieldConfigs":
                return await executeGetCustomFieldConfigs(client, params as never);
            case "searchUsers":
                return await executeSearchUsers(client, params as never);
            case "getCurrentUser":
                return await executeGetCurrentUser(client, params as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unimplemented operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
