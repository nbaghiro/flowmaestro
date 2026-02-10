import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { NetsuiteClient } from "../client/NetsuiteClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createPurchaseOrderSchema = z.object({
    entity: z.object({ id: z.string() }).describe("Vendor reference (internal ID)"),
    tranDate: z.string().optional().describe("Transaction date (YYYY-MM-DD)"),
    memo: z.string().optional().describe("Memo/notes for the purchase order"),
    currency: z.object({ id: z.string() }).optional().describe("Currency reference")
});

export type CreatePurchaseOrderParams = z.infer<typeof createPurchaseOrderSchema>;

export const createPurchaseOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createPurchaseOrder",
            name: "Create Purchase Order",
            description: "Create a new purchase order in NetSuite",
            category: "erp",
            actionType: "write",
            inputSchema: createPurchaseOrderSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "NetSuite", err: error },
            "Failed to create createPurchaseOrderOperation"
        );
        throw new Error(
            `Failed to create createPurchaseOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreatePurchaseOrder(
    client: NetsuiteClient,
    params: CreatePurchaseOrderParams
): Promise<OperationResult> {
    try {
        const purchaseOrder = await client.createPurchaseOrder(params);

        return { success: true, data: purchaseOrder };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create purchase order",
                retryable: false
            }
        };
    }
}
