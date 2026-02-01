import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Pipeline Operations
    executeListPipelines,
    executeGetPipeline,
    executeTriggerPipeline,
    // Workflow Operations
    executeListWorkflows,
    executeGetWorkflow,
    executeCancelWorkflow,
    executeRerunWorkflow,
    // Job Operations
    executeListJobs,
    executeGetJobArtifacts
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { CircleCIClient } from "../client/CircleCIClient";

/**
 * CircleCI MCP Adapter
 *
 * Converts CircleCI operations into MCP tools for AI agents
 */
export class CircleCIMCPAdapter {
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
                name: `circleci_${id}`,
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
        client: CircleCIClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("circleci_", "");

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
            // Pipeline Operations
            case "listPipelines":
                return executeListPipelines(client, params as never);
            case "getPipeline":
                return executeGetPipeline(client, params as never);
            case "triggerPipeline":
                return executeTriggerPipeline(client, params as never);

            // Workflow Operations
            case "listWorkflows":
                return executeListWorkflows(client, params as never);
            case "getWorkflow":
                return executeGetWorkflow(client, params as never);
            case "cancelWorkflow":
                return executeCancelWorkflow(client, params as never);
            case "rerunWorkflow":
                return executeRerunWorkflow(client, params as never);

            // Job Operations
            case "listJobs":
                return executeListJobs(client, params as never);
            case "getJobArtifacts":
                return executeGetJobArtifacts(client, params as never);

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
