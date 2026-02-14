import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ShipStationClient } from "../client/ShipStationClient";
import {
    executeListOrders,
    executeGetOrder,
    executeCreateOrder,
    executeUpdateOrderStatus,
    executeCreateShipment,
    executeGetRates,
    executeCreateLabel,
    executeVoidLabel,
    executeListCarriers,
    executeListServices,
    executeListWarehouses,
    executeListStores
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * ShipStation MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class ShipStationMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `shipstation_${op.id}`,
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
        client: ShipStationClient
    ): Promise<unknown> {
        // Remove "shipstation_" prefix to get operation ID
        const operationId = toolName.replace(/^shipstation_/, "");

        switch (operationId) {
            // Order operations
            case "listOrders":
                return await executeListOrders(client, params as never);
            case "getOrder":
                return await executeGetOrder(client, params as never);
            case "createOrder":
                return await executeCreateOrder(client, params as never);
            case "updateOrderStatus":
                return await executeUpdateOrderStatus(client, params as never);

            // Shipment operations
            case "createShipment":
                return await executeCreateShipment(client, params as never);

            // Rate operations
            case "getRates":
                return await executeGetRates(client, params as never);

            // Label operations
            case "createLabel":
                return await executeCreateLabel(client, params as never);
            case "voidLabel":
                return await executeVoidLabel(client, params as never);

            // Carrier operations
            case "listCarriers":
                return await executeListCarriers(client, params as never);
            case "listServices":
                return await executeListServices(client, params as never);

            // Warehouse operations
            case "listWarehouses":
                return await executeListWarehouses(client, params as never);

            // Store operations
            case "listStores":
                return await executeListStores(client, params as never);

            default:
                throw new Error(`Unknown ShipStation operation: ${operationId}`);
        }
    }
}
