import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Email Operations
    executeSendEmail,
    executeSendBatchEmails,
    executeSendTemplateEmail,
    // Template Operations
    executeListTemplates,
    executeGetTemplate,
    // Analytics Operations
    executeGetDeliveryStats,
    // Bounce Operations
    executeListBounces,
    executeActivateBounce
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

/**
 * Postmark MCP Adapter
 *
 * Converts Postmark operations into MCP tools for AI agents
 */
export class PostmarkMCPAdapter {
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
                name: `postmark_${id}`,
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
        client: PostmarkClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("postmark_", "");

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
            // Email Operations
            case "sendEmail":
                return executeSendEmail(client, params as never);
            case "sendBatchEmails":
                return executeSendBatchEmails(client, params as never);
            case "sendTemplateEmail":
                return executeSendTemplateEmail(client, params as never);

            // Template Operations
            case "listTemplates":
                return executeListTemplates(client, params as never);
            case "getTemplate":
                return executeGetTemplate(client, params as never);

            // Analytics Operations
            case "getDeliveryStats":
                return executeGetDeliveryStats(client, params as never);

            // Bounce Operations
            case "listBounces":
                return executeListBounces(client, params as never);
            case "activateBounce":
                return executeActivateBounce(client, params as never);

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
