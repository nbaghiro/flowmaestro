import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import {
    // Browse Operations
    executeSearchItems,
    executeGetItem,
    // Fulfillment Operations
    executeListOrders,
    executeGetOrder,
    executeCreateShippingFulfillment,
    // Inventory Operations
    executeGetInventoryItem,
    executeCreateOrReplaceInventoryItem
} from "../operations";
import type { MCPTool, OperationDefinition, OperationResult } from "../../../core/types";
import type { EbayClient } from "../client/EbayClient";

/**
 * eBay MCP Adapter
 *
 * Converts eBay operations into MCP tools for AI agents
 */
export class EbayMCPAdapter {
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
                name: `ebay_${id}`,
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
        client: EbayClient
    ): Promise<OperationResult> {
        const operationId = toolName.replace("ebay_", "");

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
            // Browse Operations
            case "searchItems":
                return executeSearchItems(client, params as never);
            case "getItem":
                return executeGetItem(client, params as never);

            // Fulfillment Operations
            case "listOrders":
                return executeListOrders(client, params as never);
            case "getOrder":
                return executeGetOrder(client, params as never);
            case "createShippingFulfillment":
                return executeCreateShippingFulfillment(client, params as never);

            // Inventory Operations
            case "getInventoryItem":
                return executeGetInventoryItem(client, params as never);
            case "createOrReplaceInventoryItem":
                return executeCreateOrReplaceInventoryItem(client, params as never);

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
