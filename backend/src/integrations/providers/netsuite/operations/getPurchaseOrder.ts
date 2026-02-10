import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getPurchaseOrderSchema = z.object({
    purchaseOrderId: z.string().min(1).describe("The internal ID of the purchase order")
});

export type GetPurchaseOrderParams = z.infer<typeof getPurchaseOrderSchema>;

export const getPurchaseOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPurchaseOrder",
            name: "Get Purchase Order",
            description: "Get a purchase order by ID from NetSuite",
            category: "erp",
            actionType: "read",
            inputSchema: getPurchaseOrderSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create getPurchaseOrderOperation"
        );
        throw new Error(
            `Failed to create getPurchaseOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetPurchaseOrder(
    client: NetsuiteClient,
    params: GetPurchaseOrderParams
): Promise<OperationResult> {
    try {
        const purchaseOrder = await client.getPurchaseOrder(params.purchaseOrderId);

        return { success: true, data: purchaseOrder };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get purchase order",
                retryable: false
            }
        };
    }
}
