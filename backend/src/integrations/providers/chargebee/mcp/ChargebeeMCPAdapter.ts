import { toJSONSchema } from "../../../../core/utils/zod-to-json-schema";
import { ChargebeeClient } from "../client/ChargebeeClient";
// Customer operations
import { executeCreateCustomer } from "../operations/customers/createCustomer";
import { executeGetCustomer } from "../operations/customers/getCustomer";
import { executeListCustomers } from "../operations/customers/listCustomers";
// Subscription operations
import { executeGetInvoice } from "../operations/invoices/getInvoice";
import { executeListInvoices } from "../operations/invoices/listInvoices";
import { executeCreateSubscription } from "../operations/subscriptions/createSubscription";
import { executeGetSubscription } from "../operations/subscriptions/getSubscription";
import { executeListSubscriptions } from "../operations/subscriptions/listSubscriptions";
// Invoice operations
import type { MCPTool, OperationDefinition } from "../../../core/types";

/**
 * Chargebee MCP Adapter - wraps operations as MCP tools
 */
export class ChargebeeMCPAdapter {
    constructor(private operations: Map<string, OperationDefinition>) {}

    /**
     * Get all MCP tools
     */
    getTools(): MCPTool[] {
        return Array.from(this.operations.values()).map((op) => ({
            name: `chargebee_${op.id}`,
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
        client: ChargebeeClient
    ): Promise<unknown> {
        // Remove "chargebee_" prefix to get operation ID
        const operationId = toolName.replace(/^chargebee_/, "");

        // Route to operation executor
        switch (operationId) {
            // Customer operations
            case "listCustomers":
                return await executeListCustomers(client, params as never);
            case "getCustomer":
                return await executeGetCustomer(client, params as never);
            case "createCustomer":
                return await executeCreateCustomer(client, params as never);
            // Subscription operations
            case "listSubscriptions":
                return await executeListSubscriptions(client, params as never);
            case "getSubscription":
                return await executeGetSubscription(client, params as never);
            case "createSubscription":
                return await executeCreateSubscription(client, params as never);
            // Invoice operations
            case "listInvoices":
                return await executeListInvoices(client, params as never);
            case "getInvoice":
                return await executeGetInvoice(client, params as never);
            default:
                throw new Error(`Unknown Chargebee operation: ${operationId}`);
        }
    }
}
