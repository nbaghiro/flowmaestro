import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { EtsyClient } from "../client/EtsyClient";
import {
    // Listing operations
    executeListListings,
    executeGetListing,
    executeCreateListing,
    executeUpdateListing,
    executeDeleteListing,
    // Inventory operations
    executeGetListingInventory,
    executeUpdateListingInventory,
    // Receipt operations
    executeListReceipts,
    executeGetReceipt,
    executeCreateReceiptShipment,
    // Shop operations
    executeGetShop
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Etsy MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class EtsyMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `etsy_${op.id}`,
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
        client: EtsyClient
    ): Promise<unknown> {
        // Remove "etsy_" prefix to get operation ID
        const operationId = toolName.replace(/^etsy_/, "");

        // Route to operation executor
        switch (operationId) {
            // Listing operations
            case "listListings":
                return await executeListListings(client, params as never);
            case "getListing":
                return await executeGetListing(client, params as never);
            case "createListing":
                return await executeCreateListing(client, params as never);
            case "updateListing":
                return await executeUpdateListing(client, params as never);
            case "deleteListing":
                return await executeDeleteListing(client, params as never);

            // Inventory operations
            case "getListingInventory":
                return await executeGetListingInventory(client, params as never);
            case "updateListingInventory":
                return await executeUpdateListingInventory(client, params as never);

            // Receipt operations
            case "listReceipts":
                return await executeListReceipts(client, params as never);
            case "getReceipt":
                return await executeGetReceipt(client, params as never);
            case "createReceiptShipment":
                return await executeCreateReceiptShipment(client, params as never);

            // Shop operations
            case "getShop":
                return await executeGetShop(client, params as never);

            default:
                throw new Error(`Unknown Etsy operation: ${operationId}`);
        }
    }
}
