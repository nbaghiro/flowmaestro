import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { WixClient } from "../client/WixClient";
import {
    // Product operations
    executeListProducts,
    executeGetProduct,
    executeCreateProduct,
    executeUpdateProduct,
    executeDeleteProduct,
    // Order operations
    executeListOrders,
    executeGetOrder,
    executeUpdateOrder,
    executeCancelOrder,
    // Inventory operations
    executeListInventory,
    executeGetInventory,
    executeUpdateInventory,
    executeIncrementInventory,
    executeDecrementInventory,
    // Collection operations
    executeListCollections,
    executeGetCollection
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Wix MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class WixMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `wix_${op.id}`,
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
        client: WixClient
    ): Promise<unknown> {
        // Remove "wix_" prefix to get operation ID
        const operationId = toolName.replace(/^wix_/, "");

        // Route to operation executor
        switch (operationId) {
            // Product operations
            case "listProducts":
                return await executeListProducts(client, params as never);
            case "getProduct":
                return await executeGetProduct(client, params as never);
            case "createProduct":
                return await executeCreateProduct(client, params as never);
            case "updateProduct":
                return await executeUpdateProduct(client, params as never);
            case "deleteProduct":
                return await executeDeleteProduct(client, params as never);

            // Order operations
            case "listOrders":
                return await executeListOrders(client, params as never);
            case "getOrder":
                return await executeGetOrder(client, params as never);
            case "updateOrder":
                return await executeUpdateOrder(client, params as never);
            case "cancelOrder":
                return await executeCancelOrder(client, params as never);

            // Inventory operations
            case "listInventory":
                return await executeListInventory(client, params as never);
            case "getInventory":
                return await executeGetInventory(client, params as never);
            case "updateInventory":
                return await executeUpdateInventory(client, params as never);
            case "incrementInventory":
                return await executeIncrementInventory(client, params as never);
            case "decrementInventory":
                return await executeDecrementInventory(client, params as never);

            // Collection operations
            case "listCollections":
                return await executeListCollections(client, params as never);
            case "getCollection":
                return await executeGetCollection(client, params as never);

            default:
                throw new Error(`Unknown Wix operation: ${operationId}`);
        }
    }
}
