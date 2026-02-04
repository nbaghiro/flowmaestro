import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getPurchaseOrderSchema = z.object({
    purchaseOrderId: z.string().min(1).describe("The purchase order ID")
});

export type GetPurchaseOrderParams = z.infer<typeof getPurchaseOrderSchema>;

export const getPurchaseOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPurchaseOrder",
            name: "Get Purchase Order",
            description: "Get a purchase order by ID from SAP S/4HANA",
            category: "erp",
            actionType: "read",
            inputSchema: getPurchaseOrderSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create getPurchaseOrderOperation"
        );
        throw new Error(
            `Failed to create getPurchaseOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetPurchaseOrder(
    client: SapClient,
    params: GetPurchaseOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.getPurchaseOrder(params.purchaseOrderId);

        return {
            success: true,
            data: response.d
        };
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
