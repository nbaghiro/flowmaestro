import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createCustomerSchema = z.object({
    companyName: z.string().optional().describe("Company name (for company customers)"),
    firstName: z.string().optional().describe("First name (for individual customers)"),
    lastName: z.string().optional().describe("Last name (for individual customers)"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    subsidiary: z.object({ id: z.string() }).optional().describe("Subsidiary reference"),
    currency: z.object({ id: z.string() }).optional().describe("Currency reference")
});

export type CreateCustomerParams = z.infer<typeof createCustomerSchema>;

export const createCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createCustomer",
            name: "Create Customer",
            description: "Create a new customer in NetSuite",
            category: "erp",
            actionType: "write",
            inputSchema: createCustomerSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create createCustomerOperation"
        );
        throw new Error(
            `Failed to create createCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateCustomer(
    client: NetsuiteClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const customer = await client.createCustomer(params);

        return {
            success: true,
            data: customer
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create customer",
                retryable: false
            }
        };
    }
}
