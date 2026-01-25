import {
    // Metrics Operations
    executeQueryMetrics,
    executeSubmitMetrics,
    // Monitor Operations
    executeListMonitors,
    executeGetMonitor,
    executeCreateMonitor,
    executeMuteMonitor,
    // Event Operations
    executeListEvents,
    executeCreateEvent,
    // Incident Operations
    executeListIncidents,
    executeCreateIncident
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

/**
 * Datadog MCP Adapter
 *
 * Converts Datadog operations into MCP tools for AI agents
 */
export class DatadogMCPAdapter {
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
                name: `datadog_${id}`,
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
        client: DatadogClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("datadog_", "");

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
            // Metrics Operations
            case "queryMetrics":
                return executeQueryMetrics(client, params as never);
            case "submitMetrics":
                return executeSubmitMetrics(client, params as never);

            // Monitor Operations
            case "listMonitors":
                return executeListMonitors(client, params as never);
            case "getMonitor":
                return executeGetMonitor(client, params as never);
            case "createMonitor":
                return executeCreateMonitor(client, params as never);
            case "muteMonitor":
                return executeMuteMonitor(client, params as never);

            // Event Operations
            case "listEvents":
                return executeListEvents(client, params as never);
            case "createEvent":
                return executeCreateEvent(client, params as never);

            // Incident Operations
            case "listIncidents":
                return executeListIncidents(client, params as never);
            case "createIncident":
                return executeCreateIncident(client, params as never);

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
