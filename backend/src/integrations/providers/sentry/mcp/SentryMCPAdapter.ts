import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Organization Operations
    executeListOrganizations,
    // Project Operations
    executeListProjects,
    executeGetProject,
    // Issue Operations
    executeListIssues,
    executeGetIssue,
    executeUpdateIssue,
    // Event Operations
    executeListIssueEvents,
    // Release Operations
    executeListReleases,
    executeCreateRelease,
    // Alert Operations
    executeListAlertRules
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

/**
 * Sentry MCP Adapter
 *
 * Converts Sentry operations into MCP tools for AI agents
 */
export class SentryMCPAdapter {
    private operations: Map<string, OperationDefinition>;

    constructor(operations: Map<string, OperationDefinition>) {
        this.operations = operations;
    }

    /**
     * Get MCP tools from registered operations
     */
    getTools(): MCPTool[] {
        const tools: MCPTool[] = [];

        for (const [id, operation] of this.operations.entries()) {
            tools.push({
                name: `sentry_${id}`,
                description: operation.description,
                inputSchema: toJSONSchema(operation.inputSchema)
            });
        }

        return tools;
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: SentryClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("sentry_", "");

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

        // Validate parameters using the operation's schema
        try {
            operation.inputSchema.parse(params);
        } catch (error) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: error instanceof Error ? error.message : "Invalid parameters",
                    retryable: false
                }
            };
        }

        // Route to appropriate operation executor
        switch (operationId) {
            // Organization Operations
            case "listOrganizations":
                return executeListOrganizations(client, params as never);

            // Project Operations
            case "listProjects":
                return executeListProjects(client, params as never);
            case "getProject":
                return executeGetProject(client, params as never);

            // Issue Operations
            case "listIssues":
                return executeListIssues(client, params as never);
            case "getIssue":
                return executeGetIssue(client, params as never);
            case "updateIssue":
                return executeUpdateIssue(client, params as never);

            // Event Operations
            case "listIssueEvents":
                return executeListIssueEvents(client, params as never);

            // Release Operations
            case "listReleases":
                return executeListReleases(client, params as never);
            case "createRelease":
                return executeCreateRelease(client, params as never);

            // Alert Operations
            case "listAlertRules":
                return executeListAlertRules(client, params as never);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Operation not implemented: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }
}
