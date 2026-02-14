import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { CreateCustomerSchema, type CreateCustomerParams } from "../schemas";
import type { MagentoCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createCustomer",
            name: "Create Customer",
            description: "Create a new customer account in Magento",
            category: "customers",
            inputSchema: CreateCustomerSchema,
            retryable: false,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create createCustomerOperation"
        );
        throw new Error(
            `Failed to create createCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateCustomer(
    client: MagentoClient,
    params: CreateCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.createCustomer({
            email: params.email,
            firstname: params.firstname,
            lastname: params.lastname,
            group_id: params.group_id,
            website_id: params.website_id,
            store_id: params.store_id,
            prefix: params.prefix,
            middlename: params.middlename,
            suffix: params.suffix,
            dob: params.dob,
            gender: params.gender ? parseInt(params.gender, 10) : undefined,
            taxvat: params.taxvat
        });

        const customer = response as MagentoCustomer;

        return {
            success: true,
            data: {
                customer,
                customer_id: customer.id,
                email: customer.email,
                message: "Customer created successfully"
            }
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
