import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ShippoClient } from "../client/ShippoClient";
import {
    executeValidateAddress,
    executeCreateShipment,
    executeListShipments,
    executeGetShipment,
    executeGetRates,
    executeCreateLabel,
    executeGetLabel,
    executeTrackShipment,
    executeGetTrackingStatus,
    executeCreateManifest,
    executeListCarrierAccounts
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Shippo MCP Adapter - wraps operations as MCP tools for AI agents
 */
export class ShippoMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `shippo_${op.id}`,
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
        client: ShippoClient
    ): Promise<unknown> {
        // Remove "shippo_" prefix to get operation ID
        const operationId = toolName.replace(/^shippo_/, "");

        switch (operationId) {
            // Address operations
            case "validateAddress":
                return await executeValidateAddress(client, params as never);

            // Shipment operations
            case "createShipment":
                return await executeCreateShipment(client, params as never);
            case "listShipments":
                return await executeListShipments(client, params as never);
            case "getShipment":
                return await executeGetShipment(client, params as never);

            // Rate operations
            case "getRates":
                return await executeGetRates(client, params as never);

            // Label operations
            case "createLabel":
                return await executeCreateLabel(client, params as never);
            case "getLabel":
                return await executeGetLabel(client, params as never);

            // Tracking operations
            case "trackShipment":
                return await executeTrackShipment(client, params as never);
            case "getTrackingStatus":
                return await executeGetTrackingStatus(client, params as never);

            // Manifest operations
            case "createManifest":
                return await executeCreateManifest(client, params as never);

            // Carrier account operations
            case "listCarrierAccounts":
                return await executeListCarrierAccounts(client, params as never);

            default:
                throw new Error(`Unknown Shippo operation: ${operationId}`);
        }
    }
}
