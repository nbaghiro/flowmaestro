import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const banCustomerSchema = z.object({
    id: z.string().describe("Customer ID to ban"),
    days: z.number().min(1).default(1).describe("Number of days to ban the customer")
});

export type BanCustomerParams = z.infer<typeof banCustomerSchema>;

export const banCustomerOperation: OperationDefinition = {
    id: "banCustomer",
    name: "Ban Customer",
    description: "Ban a customer from starting new chats",
    category: "customers",
    actionType: "write",
    inputSchema: banCustomerSchema,
    retryable: false,
    timeout: 10000
};

export async function executeBanCustomer(
    client: LiveChatClient,
    params: BanCustomerParams
): Promise<OperationResult> {
    try {
        await client.agentAction<Record<string, never>>("ban_customer", {
            id: params.id,
            ban: { days: params.days }
        });

        return {
            success: true,
            data: {
                customerId: params.id,
                banned: true,
                days: params.days
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to ban customer",
                retryable: false
            }
        };
    }
}
