import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const updateCustomerSchema = z.object({
    customer_id: z.number().describe("Customer ID"),
    firstName: z.string().optional().describe("Updated first name"),
    lastName: z.string().optional().describe("Updated last name"),
    organization: z.string().optional().describe("Updated organization"),
    jobTitle: z.string().optional().describe("Updated job title"),
    background: z.string().optional().describe("Updated background info"),
    location: z.string().optional().describe("Updated location")
});

export type UpdateCustomerParams = z.infer<typeof updateCustomerSchema>;

export const updateCustomerOperation: OperationDefinition = {
    id: "updateCustomer",
    name: "Update Customer",
    description: "Update customer details",
    category: "customers",
    actionType: "write",
    inputSchema: updateCustomerSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateCustomer(
    client: HelpScoutClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        const { customer_id, ...updateData } = params;
        await client.put<null>(`/customers/${customer_id}`, updateData);

        return {
            success: true,
            data: {
                customerId: customer_id,
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
