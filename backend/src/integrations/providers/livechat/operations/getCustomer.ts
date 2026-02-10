import { z } from "zod";
import { LiveChatClient } from "../client/LiveChatClient";
import type { LiveChatCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getCustomerSchema = z.object({
    id: z.string().describe("Customer ID")
});

export type GetCustomerParams = z.infer<typeof getCustomerSchema>;

export const getCustomerOperation: OperationDefinition = {
    id: "getCustomer",
    name: "Get Customer",
    description: "Get customer details by ID",
    category: "customers",
    actionType: "read",
    inputSchema: getCustomerSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetCustomer(
    client: LiveChatClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.agentAction<LiveChatCustomer>("get_customer", {
            id: params.id
        });

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                email: response.email,
                avatar: response.avatar,
                sessionFields: response.session_fields,
                lastVisit: response.last_visit,
                statistics: response.statistics,
                createdAt: response.created_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get customer",
                retryable: true
            }
        };
    }
}
