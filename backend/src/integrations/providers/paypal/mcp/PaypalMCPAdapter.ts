import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { PaypalClient } from "../client/PaypalClient";
import {
    // Orders
    executeCreateOrder,
    executeGetOrder,
    executeCaptureOrder,
    // Payments / Refunds
    executeRefundPayment,
    executeGetRefund,
    // Reporting
    executeSearchTransactions,
    // Invoicing
    executeCreateInvoice,
    executeSendInvoice,
    executeGetInvoice,
    // Payouts
    executeCreatePayout,
    executeGetPayoutDetails
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * PayPal MCP Adapter - wraps operations as MCP tools
 */
export class PaypalMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `paypal_${op.id}`,
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
        client: PaypalClient
    ): Promise<unknown> {
        // Remove "paypal_" prefix to get operation ID
        const operationId = toolName.replace(/^paypal_/, "");

        // Route to operation executor
        switch (operationId) {
            // Orders
            case "createOrder":
                return await executeCreateOrder(client, params as never);
            case "getOrder":
                return await executeGetOrder(client, params as never);
            case "captureOrder":
                return await executeCaptureOrder(client, params as never);

            // Payments / Refunds
            case "refundPayment":
                return await executeRefundPayment(client, params as never);
            case "getRefund":
                return await executeGetRefund(client, params as never);

            // Reporting
            case "searchTransactions":
                return await executeSearchTransactions(client, params as never);

            // Invoicing
            case "createInvoice":
                return await executeCreateInvoice(client, params as never);
            case "sendInvoice":
                return await executeSendInvoice(client, params as never);
            case "getInvoice":
                return await executeGetInvoice(client, params as never);

            // Payouts
            case "createPayout":
                return await executeCreatePayout(client, params as never);
            case "getPayoutDetails":
                return await executeGetPayoutDetails(client, params as never);

            default:
                throw new Error(`Unknown PayPal operation: ${operationId}`);
        }
    }
}
