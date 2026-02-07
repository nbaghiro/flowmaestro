import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { BillComClient } from "../client/BillComClient";
// Vendor operations
// Bill operations
import { executeCreateBill } from "../operations/bills/createBill";
import { executeGetBill } from "../operations/bills/getBill";
import { executeListBills } from "../operations/bills/listBills";
// Payment operations
import { executeCreatePayment } from "../operations/payments/createPayment";
import { executeCreateVendor } from "../operations/vendors/createVendor";
import { executeGetVendor } from "../operations/vendors/getVendor";
import { executeListVendors } from "../operations/vendors/listVendors";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Bill.com MCP Adapter - wraps operations as MCP tools
 */
export class BillComMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `billcom_${op.id}`,
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
        client: BillComClient
    ): Promise<unknown> {
        // Remove "billcom_" prefix to get operation ID
        const operationId = toolName.replace(/^billcom_/, "");

        // Route to operation executor
        switch (operationId) {
            // Vendor operations
            case "listVendors":
                return await executeListVendors(client, params as never);
            case "getVendor":
                return await executeGetVendor(client, params as never);
            case "createVendor":
                return await executeCreateVendor(client, params as never);
            // Bill operations
            case "listBills":
                return await executeListBills(client, params as never);
            case "getBill":
                return await executeGetBill(client, params as never);
            case "createBill":
                return await executeCreateBill(client, params as never);
            // Payment operations
            case "createPayment":
                return await executeCreatePayment(client, params as never);
            default:
                throw new Error(`Unknown Bill.com operation: ${operationId}`);
        }
    }
}
