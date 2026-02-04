import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getItemSchema = z.object({
    itemId: z.string().min(1).describe("The internal ID of the item")
});

export type GetItemParams = z.infer<typeof getItemSchema>;

export const getItemOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getItem",
            name: "Get Item",
            description: "Get an inventory item by ID from NetSuite",
            category: "erp",
            actionType: "read",
            inputSchema: getItemSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "NetSuite", err: error }, "Failed to create getItemOperation");
        throw new Error(
            `Failed to create getItem operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetItem(
    client: NetsuiteClient,
    params: GetItemParams
): Promise<OperationResult> {
    try {
        const item = await client.getItem(params.itemId);

        return { success: true, data: item };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get item",
                retryable: false
            }
        };
    }
}
