import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const updateCustomerSchema = z.object({
    id: z.string().describe("Customer ID"),
    name: z.string().optional().describe("Updated customer name"),
    email: z.string().email().optional().describe("Updated customer email"),
    avatar: z.string().url().optional().describe("Updated avatar URL"),
    session_fields: z
        .array(z.object({ key: z.string(), value: z.string() }))
        .optional()
        .describe("Session field key-value pairs to update")
});

export type UpdateCustomerParams = z.infer<typeof updateCustomerSchema>;

export const updateCustomerOperation: OperationDefinition = {
    id: "updateCustomer",
    name: "Update Customer",
    description: "Update customer properties",
    category: "customers",
    actionType: "write",
    inputSchema: updateCustomerSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateCustomer(
    client: LiveChatClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        await client.agentAction<Record<string, never>>(
            "update_customer",
            params as unknown as Record<string, unknown>
        );

        return {
            success: true,
            data: {
                customerId: params.id,
                updated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update customer",
                retryable: true
            }
        };
    }
}
