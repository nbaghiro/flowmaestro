import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { SquareClient } from "../client/SquareClient";
import {
    // Payments
    executeCreatePayment,
    executeCompletePayment,
    executeGetPayment,
    executeListPayments,
    // Refunds
    executeCreateRefund,
    executeGetRefund,
    executeListRefunds,
    // Customers
    executeCreateCustomer,
    executeUpdateCustomer,
    executeGetCustomer,
    executeListCustomers,
    // Orders
    executeGetOrder
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Square MCP Adapter - wraps operations as MCP tools
 */
export class SquareMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `square_${op.id}`,
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
        client: SquareClient
    ): Promise<unknown> {
        // Remove "square_" prefix to get operation ID
        const operationId = toolName.replace(/^square_/, "");

        // Route to operation executor
        switch (operationId) {
            // Payments
            case "createPayment":
                return await executeCreatePayment(client, params as never);
            case "completePayment":
                return await executeCompletePayment(client, params as never);
            case "getPayment":
                return await executeGetPayment(client, params as never);
            case "listPayments":
                return await executeListPayments(client, params as never);

            // Refunds
            case "createRefund":
                return await executeCreateRefund(client, params as never);
            case "getRefund":
                return await executeGetRefund(client, params as never);
            case "listRefunds":
                return await executeListRefunds(client, params as never);

            // Customers
            case "createCustomer":
                return await executeCreateCustomer(client, params as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, params as never);
            case "getCustomer":
                return await executeGetCustomer(client, params as never);
            case "listCustomers":
                return await executeListCustomers(client, params as never);

            // Orders
            case "getOrder":
                return await executeGetOrder(client, params as never);

            default:
                throw new Error(`Unknown Square operation: ${operationId}`);
        }
    }
}
