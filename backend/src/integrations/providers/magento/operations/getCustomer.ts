import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { GetCustomerSchema, type GetCustomerParams } from "../schemas";
import type { MagentoCustomer } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getCustomerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCustomer",
            name: "Get Customer",
            description: "Retrieve a single customer by their entity ID",
            category: "customers",
            inputSchema: GetCustomerSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Magento", err: error }, "Failed to create getCustomerOperation");
        throw new Error(
            `Failed to create getCustomer operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetCustomer(
    client: MagentoClient,
    params: GetCustomerParams
): Promise<OperationResult> {
    try {
        const response = await client.getCustomer(params.customer_id);
        const customer = response as MagentoCustomer;

        return {
            success: true,
            data: {
                customer
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
