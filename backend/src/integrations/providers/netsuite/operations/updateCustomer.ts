import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const updateCustomerSchema = z.object({
    customerId: z.string().min(1).describe("The internal ID of the customer to update"),
    companyName: z.string().optional().describe("Updated company name"),
    firstName: z.string().optional().describe("Updated first name"),
    lastName: z.string().optional().describe("Updated last name"),
    email: z.string().email().optional().describe("Updated email address"),
    phone: z.string().optional().describe("Updated phone number")
});

export type UpdateCustomerParams = z.infer<typeof updateCustomerSchema>;

export const updateCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateCustomer",
            name: "Update Customer",
            description: "Update an existing customer in NetSuite",
            category: "erp",
            actionType: "write",
            inputSchema: updateCustomerSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create updateCustomerOperation"
        );
        throw new Error(
            `Failed to create updateCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeUpdateCustomer(
    client: NetsuiteClient,
    params: UpdateCustomerParams
): Promise<OperationResult> {
    try {
        const { customerId, ...updateData } = params;
        const customer = await client.updateCustomer(customerId, updateData);

        return {
            success: true,
            data: customer
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update customer",
                retryable: false
            }
        };
    }
}
