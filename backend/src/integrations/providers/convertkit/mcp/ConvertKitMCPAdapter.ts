import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Subscriber Operations
    executeGetSubscribers,
    executeGetSubscriber,
    executeCreateSubscriber,
    executeUpdateSubscriber,
    executeUnsubscribeSubscriber,
    // Tag Operations
    executeGetTags,
    executeCreateTag,
    executeAddTagToSubscriber,
    executeRemoveTagFromSubscriber,
    // Sequence Operations
    executeGetSequences,
    executeAddSubscriberToSequence,
    // Form Operations
    executeGetForms,
    executeAddSubscriberToForm,
    // Broadcast Operations
    executeGetBroadcasts,
    executeGetBroadcast
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

/**
 * ConvertKit MCP Adapter
 *
 * Converts ConvertKit operations into MCP tools for AI agents
 */
export class ConvertKitMCPAdapter {
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
                name: `convertkit_${id}`,
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
        client: ConvertKitClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("convertkit_", "");

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
            // Subscriber Operations
            case "getSubscribers":
                return executeGetSubscribers(client, params as never);
            case "getSubscriber":
                return executeGetSubscriber(client, params as never);
            case "createSubscriber":
                return executeCreateSubscriber(client, params as never);
            case "updateSubscriber":
                return executeUpdateSubscriber(client, params as never);
            case "unsubscribeSubscriber":
                return executeUnsubscribeSubscriber(client, params as never);

            // Tag Operations
            case "getTags":
                return executeGetTags(client, params as never);
            case "createTag":
                return executeCreateTag(client, params as never);
            case "addTagToSubscriber":
                return executeAddTagToSubscriber(client, params as never);
            case "removeTagFromSubscriber":
                return executeRemoveTagFromSubscriber(client, params as never);

            // Sequence Operations
            case "getSequences":
                return executeGetSequences(client, params as never);
            case "addSubscriberToSequence":
                return executeAddSubscriberToSequence(client, params as never);

            // Form Operations
            case "getForms":
                return executeGetForms(client, params as never);
            case "addSubscriberToForm":
                return executeAddSubscriberToForm(client, params as never);

            // Broadcast Operations
            case "getBroadcasts":
                return executeGetBroadcasts(client, params as never);
            case "getBroadcast":
                return executeGetBroadcast(client, params as never);

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
