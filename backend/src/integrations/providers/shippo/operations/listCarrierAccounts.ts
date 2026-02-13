import { getLogger } from "../../../../core/logging";
import { ShippoClient } from "../client/ShippoClient";
import { ListCarrierAccountsSchema, type ListCarrierAccountsParams } from "../schemas";
import type { ShippoListResponse, ShippoCarrierAccount } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listCarrierAccountsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCarrierAccounts",
            name: "List Carrier Accounts",
            description: "Retrieve a list of connected carrier accounts",
            category: "carriers",
            inputSchema: ListCarrierAccountsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Shippo", err: error },
            "Failed to create listCarrierAccountsOperation"
        );
        throw new Error(
            `Failed to create listCarrierAccounts operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListCarrierAccounts(
    client: ShippoClient,
    params: ListCarrierAccountsParams
): Promise<OperationResult> {
    try {
        const response = await client.listCarrierAccounts({
            carrier: params.carrier,
            page: params.page,
            results: params.results
        });

        const data = response as ShippoListResponse<ShippoCarrierAccount>;

        return {
            success: true,
            data: {
                carrier_accounts: data.results,
                total_count: data.count,
                page: params.page || 1,
                has_more: !!data.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list carrier accounts",
                retryable: true
            }
        };
    }
}
