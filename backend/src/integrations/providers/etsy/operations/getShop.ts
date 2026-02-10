import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { GetShopSchema, type GetShopParams } from "../schemas";
import type { EtsyShop } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Shop operation definition
 */
export const getShopOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getShop",
            name: "Get Shop",
            description:
                "Get Etsy shop details including name, description, policies, and statistics",
            category: "shop",
            inputSchema: GetShopSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Etsy", err: error }, "Failed to create getShopOperation");
        throw new Error(
            `Failed to create getShop operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get shop operation
 */
export async function executeGetShop(
    client: EtsyClient,
    params: GetShopParams
): Promise<OperationResult> {
    try {
        const response = await client.getShop(params.shop_id);

        const shop = response as EtsyShop;

        return {
            success: true,
            data: {
                shop
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get shop";
        const isNotFound = message.toLowerCase().includes("not found");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
