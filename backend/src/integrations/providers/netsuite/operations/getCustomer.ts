import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getCustomerSchema = z.object({
    customerId: z.string().min(1).describe("The internal ID of the customer")
});

export type GetCustomerParams = z.infer<typeof getCustomerSchema>;

export const getCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCustomer",
            name: "Get Customer",
            description: "Get a customer by ID from NetSuite",
            category: "erp",
            actionType: "read",
            inputSchema: getCustomerSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create getCustomerOperation"
        );
        throw new Error(
            `Failed to create getCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetCustomer(
    client: NetsuiteClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const customer = await client.getCustomer(params.customerId);

        return {
            success: true,
            data: customer
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get customer",
                retryable: false
            }
        };
    }
}
