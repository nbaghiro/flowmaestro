import {
    // Project Operations
    executeListProjects,
    executeGetProject,
    // Deployment Operations
    executeListDeployments,
    executeGetDeployment,
    executeCreateDeployment,
    executeCancelDeployment,
    // Domain Operations
    executeListDomains,
    executeAddDomain,
    // Environment Variable Operations
    executeGetEnvironmentVariables,
    executeSetEnvironmentVariable
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

/**
 * Vercel MCP Adapter
 *
 * Converts Vercel operations into MCP tools for AI agents
 */
export class VercelMCPAdapter {
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
                name: `vercel_${id}`,
                description: operation.description,
                inputSchema: operation.inputSchemaJSON
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
        client: VercelClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("vercel_", "");

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
            // Project Operations
            case "listProjects":
                return executeListProjects(client, params as never);
            case "getProject":
                return executeGetProject(client, params as never);

            // Deployment Operations
            case "listDeployments":
                return executeListDeployments(client, params as never);
            case "getDeployment":
                return executeGetDeployment(client, params as never);
            case "createDeployment":
                return executeCreateDeployment(client, params as never);
            case "cancelDeployment":
                return executeCancelDeployment(client, params as never);

            // Domain Operations
            case "listDomains":
                return executeListDomains(client, params as never);
            case "addDomain":
                return executeAddDomain(client, params as never);

            // Environment Variable Operations
            case "getEnvironmentVariables":
                return executeGetEnvironmentVariables(client, params as never);
            case "setEnvironmentVariable":
                return executeSetEnvironmentVariable(client, params as never);

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
