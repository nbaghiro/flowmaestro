import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { StripeClient } from "../client/StripeClient";
import {
    // Payment Intents
    executeCreatePaymentIntent,
    executeConfirmPaymentIntent,
    executeCancelPaymentIntent,
    executeGetPaymentIntent,
    executeListPaymentIntents,
    // Charges
    executeCreateCharge,
    executeGetCharge,
    executeListCharges,
    // Refunds
    executeCreateRefund,
    executeGetRefund,
    executeListRefunds,
    // Customers
    executeCreateCustomer,
    executeUpdateCustomer,
    executeGetCustomer,
    executeListCustomers
} from "../operations";
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Stripe MCP Adapter - wraps operations as MCP tools
 */
export class StripeMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `stripe_${op.id}`,
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
        client: StripeClient
    ): Promise<unknown> {
        // Remove "stripe_" prefix to get operation ID
        const operationId = toolName.replace(/^stripe_/, "");

        // Route to operation executor
        switch (operationId) {
            // Payment Intents
            case "createPaymentIntent":
                return await executeCreatePaymentIntent(client, params as never);
            case "confirmPaymentIntent":
                return await executeConfirmPaymentIntent(client, params as never);
            case "cancelPaymentIntent":
                return await executeCancelPaymentIntent(client, params as never);
            case "getPaymentIntent":
                return await executeGetPaymentIntent(client, params as never);
            case "listPaymentIntents":
                return await executeListPaymentIntents(client, params as never);

            // Charges
            case "createCharge":
                return await executeCreateCharge(client, params as never);
            case "getCharge":
                return await executeGetCharge(client, params as never);
            case "listCharges":
                return await executeListCharges(client, params as never);

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

            default:
                throw new Error(`Unknown Stripe operation: ${operationId}`);
        }
    }
}
