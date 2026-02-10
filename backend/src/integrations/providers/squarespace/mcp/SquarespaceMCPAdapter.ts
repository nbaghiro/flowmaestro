import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { SquarespaceClient } from "../client/SquarespaceClient";
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
    executeFulfillOrder,
    // Inventory operations
    executeListInventory,
    executeGetInventoryItem,
    executeAdjustInventory,
    // Transaction operations
    executeListTransactions,
    // Site operations
    executeGetSiteInfo
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Squarespace MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class SquarespaceMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `squarespace_${op.id}`,
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
        client: SquarespaceClient
    ): Promise<unknown> {
        // Remove "squarespace_" prefix to get operation ID
        const operationId = toolName.replace(/^squarespace_/, "");

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
            case "fulfillOrder":
                return await executeFulfillOrder(client, params as never);

            // Inventory operations
            case "listInventory":
                return await executeListInventory(client, params as never);
            case "getInventoryItem":
                return await executeGetInventoryItem(client, params as never);
            case "adjustInventory":
                return await executeAdjustInventory(client, params as never);

            // Transaction operations
            case "listTransactions":
                return await executeListTransactions(client, params as never);

            // Site operations
            case "getSiteInfo":
                return await executeGetSiteInfo(client, params as never);

            default:
                throw new Error(`Unknown Squarespace operation: ${operationId}`);
        }
    }
}
