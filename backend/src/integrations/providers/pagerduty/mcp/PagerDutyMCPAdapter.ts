import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Incident Operations
    executeListIncidents,
    executeGetIncident,
    executeCreateIncident,
    executeUpdateIncident,
    // Service Operations
    executeListServices,
    executeGetService,
    // Escalation Policy Operations
    executeListEscalationPolicies,
    // On-Call Operations
    executeListOnCalls,
    // User Operations
    executeListUsers,
    // Schedule Operations
    executeListSchedules
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

/**
 * PagerDuty MCP Adapter
 *
 * Converts PagerDuty operations into MCP tools for AI agents
 */
export class PagerDutyMCPAdapter {
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
                name: `pagerduty_${id}`,
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
        client: PagerDutyClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("pagerduty_", "");

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
            // Incident Operations
            case "listIncidents":
                return executeListIncidents(client, params as never);
            case "getIncident":
                return executeGetIncident(client, params as never);
            case "createIncident":
                return executeCreateIncident(client, params as never);
            case "updateIncident":
                return executeUpdateIncident(client, params as never);

            // Service Operations
            case "listServices":
                return executeListServices(client, params as never);
            case "getService":
                return executeGetService(client, params as never);

            // Escalation Policy Operations
            case "listEscalationPolicies":
                return executeListEscalationPolicies(client, params as never);

            // On-Call Operations
            case "listOnCalls":
                return executeListOnCalls(client, params as never);

            // User Operations
            case "listUsers":
                return executeListUsers(client, params as never);

            // Schedule Operations
            case "listSchedules":
                return executeListSchedules(client, params as never);

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
