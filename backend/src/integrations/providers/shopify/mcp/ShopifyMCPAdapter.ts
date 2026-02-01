import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ShopifyClient } from "../client/ShopifyClient";
import {
    // Order operations
    executeListOrders,
    executeGetOrder,
    executeUpdateOrder,
    executeCloseOrder,
    executeCancelOrder,
    // Product operations
    executeListProducts,
    executeGetProduct,
    executeCreateProduct,
    executeUpdateProduct,
    // Inventory operations
    executeListInventoryLevels,
    executeAdjustInventory,
    executeSetInventory,
    // Webhook operations
    executeListWebhooks,
    executeCreateWebhook,
    executeDeleteWebhook
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Shopify MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class ShopifyMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `shopify_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema),
            executeRef: op.id
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeTool(
        toolName: string,
        params: Record<string, unknown>,
        client: ShopifyClient
    ): Promise<unknown> {
        // Remove "shopify_" prefix to get operation ID
        const operationId = toolName.replace(/^shopify_/, "");

        // Route to operation executor
        switch (operationId) {
            // Order operations
            case "listOrders":
                return await executeListOrders(client, params as never);
            case "getOrder":
                return await executeGetOrder(client, params as never);
            case "updateOrder":
                return await executeUpdateOrder(client, params as never);
            case "closeOrder":
                return await executeCloseOrder(client, params as never);
            case "cancelOrder":
                return await executeCancelOrder(client, params as never);

            // Product operations
            case "listProducts":
                return await executeListProducts(client, params as never);
            case "getProduct":
                return await executeGetProduct(client, params as never);
            case "createProduct":
                return await executeCreateProduct(client, params as never);
            case "updateProduct":
                return await executeUpdateProduct(client, params as never);

            // Inventory operations
            case "listInventoryLevels":
                return await executeListInventoryLevels(client, params as never);
            case "adjustInventory":
                return await executeAdjustInventory(client, params as never);
            case "setInventory":
                return await executeSetInventory(client, params as never);

            // Webhook operations
            case "listWebhooks":
                return await executeListWebhooks(client, params as never);
            case "createWebhook":
                return await executeCreateWebhook(client, params as never);
            case "deleteWebhook":
                return await executeDeleteWebhook(client, params as never);

            default:
                throw new Error(`Unknown Shopify operation: ${operationId}`);
        }
    }
}
