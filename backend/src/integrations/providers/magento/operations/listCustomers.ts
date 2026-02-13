import { getLogger } from "../../../../core/logging";
import { MagentoClient } from "../client/MagentoClient";
import { ListCustomersSchema, type ListCustomersParams } from "../schemas";
import type { MagentoCustomersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listCustomersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCustomers",
            name: "List Customers",
            description:
                "Retrieve a list of customers with optional filters for email, name, and group",
            category: "customers",
            inputSchema: ListCustomersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Magento", err: error },
            "Failed to create listCustomersOperation"
        );
        throw new Error(
            `Failed to create listCustomers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListCustomers(
    client: MagentoClient,
    params: ListCustomersParams
): Promise<OperationResult> {
    try {
        const response = await client.listCustomers({
            email: params.email,
            firstname: params.firstname,
            lastname: params.lastname,
            group_id: params.group_id,
            page: params.page,
            pageSize: params.pageSize
        });

        const data = response as MagentoCustomersResponse;

        return {
            success: true,
            data: {
                customers: data.items,
                total_count: data.total_count,
                page: params.page || 1,
                page_size: params.pageSize || 20
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list customers",
                retryable: true
            }
        };
    }
}
