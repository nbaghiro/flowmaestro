import { getLogger } from "../../../../core/logging";
import { EtsyClient } from "../client/EtsyClient";
import { UpdateListingInventorySchema, type UpdateListingInventoryParams } from "../schemas";
import type { EtsyInventoryResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Update Listing Inventory operation definition
 */
export const updateListingInventoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateListingInventory",
            name: "Update Listing Inventory",
            description:
                "Update inventory/SKUs for an Etsy listing including prices, quantities, and variations",
            category: "inventory",
            inputSchema: UpdateListingInventorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Etsy", err: error },
            "Failed to create updateListingInventoryOperation"
        );
        throw new Error(
            `Failed to create updateListingInventory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute update listing inventory operation
 */
export async function executeUpdateListingInventory(
    client: EtsyClient,
    params: UpdateListingInventoryParams
): Promise<OperationResult> {
    try {
        const response = await client.updateListingInventory(params.listing_id, {
            products: params.products.map((p) => ({
                sku: p.sku,
                property_values: p.property_values?.map((pv) => ({
                    property_id: pv.property_id,
                    value_ids: pv.value_ids,
                    values: pv.values
                })),
                offerings: p.offerings.map((o) => ({
                    price: o.price,
                    quantity: o.quantity,
                    is_enabled: o.is_enabled
                }))
            })),
            price_on_property: params.price_on_property,
            quantity_on_property: params.quantity_on_property,
            sku_on_property: params.sku_on_property
        });

        const inventory = response as EtsyInventoryResponse;

        return {
            success: true,
            data: {
                inventory,
                message: "Listing inventory updated successfully"
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to update listing inventory";
        const isNotFound = message.toLowerCase().includes("not found");
        const isValidation = message.toLowerCase().includes("validation");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : isValidation ? "validation" : "server_error",
                message,
                retryable: !isNotFound && !isValidation
            }
        };
    }
}
