import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { WooCommerceClient } from "../client/WooCommerceClient";
import {
    // Order operations
    executeListOrders,
    executeGetOrder,
    executeCreateOrder,
    executeUpdateOrder,
    // Product operations
    executeListProducts,
    executeGetProduct,
    executeCreateProduct,
    executeUpdateProduct,
    // Customer operations
    executeListCustomers,
    executeGetCustomer,
    executeCreateCustomer,
    executeUpdateCustomer,
    // Inventory operations
    executeUpdateInventory,
    // Webhook operations
    executeListWebhooks,
    executeCreateWebhook,
    executeDeleteWebhook
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * WooCommerce MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class WooCommerceMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `woocommerce_${op.id}`,
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
        client: WooCommerceClient
    ): Promise<unknown> {
        // Remove "woocommerce_" prefix to get operation ID
        const operationId = toolName.replace(/^woocommerce_/, "");

        // Route to operation executor
        switch (operationId) {
            // Order operations
            case "listOrders":
                return await executeListOrders(client, params as never);
            case "getOrder":
                return await executeGetOrder(client, params as never);
            case "createOrder":
                return await executeCreateOrder(client, params as never);
            case "updateOrder":
                return await executeUpdateOrder(client, params as never);

            // Product operations
            case "listProducts":
                return await executeListProducts(client, params as never);
            case "getProduct":
                return await executeGetProduct(client, params as never);
            case "createProduct":
                return await executeCreateProduct(client, params as never);
            case "updateProduct":
                return await executeUpdateProduct(client, params as never);

            // Customer operations
            case "listCustomers":
                return await executeListCustomers(client, params as never);
            case "getCustomer":
                return await executeGetCustomer(client, params as never);
            case "createCustomer":
                return await executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, params as never);

            // Inventory operations
            case "updateInventory":
                return await executeUpdateInventory(client, params as never);

            // Webhook operations
            case "listWebhooks":
                return await executeListWebhooks(client, params as never);
            case "createWebhook":
                return await executeCreateWebhook(client, params as never);
            case "deleteWebhook":
                return await executeDeleteWebhook(client, params as never);

            default:
                throw new Error(`Unknown WooCommerce operation: ${operationId}`);
        }
    }
}
