import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { AmazonSellerCentralClient } from "../client/AmazonSellerCentralClient";
import {
    // Order operations
    executeListOrders,
    executeGetOrder,
    executeGetOrderItems,
    // Catalog operations
    executeSearchCatalogItems,
    executeGetCatalogItem,
    // Inventory operations
    executeGetInventorySummaries,
    // Pricing operations
    executeGetCompetitivePricing,
    executeGetItemOffers
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Amazon Seller Central MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class AmazonSellerCentralMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `amazon_seller_central_${op.id}`,
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
        client: AmazonSellerCentralClient
    ): Promise<unknown> {
        // Remove "amazon_seller_central_" prefix to get operation ID
        const operationId = toolName.replace(/^amazon_seller_central_/, "");

        // Route to operation executor
        switch (operationId) {
            // Order operations
            case "listOrders":
                return await executeListOrders(client, params as never);
            case "getOrder":
                return await executeGetOrder(client, params as never);
            case "getOrderItems":
                return await executeGetOrderItems(client, params as never);

            // Catalog operations
            case "searchCatalogItems":
                return await executeSearchCatalogItems(client, params as never);
            case "getCatalogItem":
                return await executeGetCatalogItem(client, params as never);

            // Inventory operations
            case "getInventorySummaries":
                return await executeGetInventorySummaries(client, params as never);

            // Pricing operations
            case "getCompetitivePricing":
                return await executeGetCompetitivePricing(client, params as never);
            case "getItemOffers":
                return await executeGetItemOffers(client, params as never);

            default:
                throw new Error(`Unknown Amazon Seller Central operation: ${operationId}`);
        }
    }
}
