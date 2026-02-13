import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { MagentoClient } from "../client/MagentoClient";
import {
    executeListProducts,
    executeGetProduct,
    executeCreateProduct,
    executeUpdateProduct,
    executeListOrders,
    executeGetOrder,
    executeUpdateOrderStatus,
    executeListCustomers,
    executeGetCustomer,
    executeCreateCustomer,
    executeGetInventory,
    executeUpdateInventory,
    executeListCategories
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Magento MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class MagentoMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `magento_${op.id}`,
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
        client: MagentoClient
    ): Promise<unknown> {
        // Remove "magento_" prefix to get operation ID
        const operationId = toolName.replace(/^magento_/, "");

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

            // Order operations
            case "listOrders":
                return await executeListOrders(client, params as never);
            case "getOrder":
                return await executeGetOrder(client, params as never);
            case "updateOrderStatus":
                return await executeUpdateOrderStatus(client, params as never);

            // Customer operations
            case "listCustomers":
                return await executeListCustomers(client, params as never);
            case "getCustomer":
                return await executeGetCustomer(client, params as never);
            case "createCustomer":
                return await executeCreateCustomer(client, params as never);

            // Inventory operations
            case "getInventory":
                return await executeGetInventory(client, params as never);
            case "updateInventory":
                return await executeUpdateInventory(client, params as never);

            // Category operations
            case "listCategories":
                return await executeListCategories(client, params as never);

            default:
                throw new Error(`Unknown Magento operation: ${operationId}`);
        }
    }
}
