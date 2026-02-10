import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createPurchaseOrderSchema = z.object({
    PurchaseOrderType: z.string().describe("Purchase order type (e.g., 'NB' for standard)"),
    PurchasingOrganization: z.string().describe("Purchasing organization code"),
    PurchasingGroup: z.string().describe("Purchasing group code"),
    Supplier: z.string().describe("Supplier business partner ID"),
    DocumentCurrency: z.string().optional().describe("Currency code (e.g., 'EUR', 'USD')"),
    PurchaseOrderDate: z.string().optional().describe("Purchase order date (YYYY-MM-DD)")
});

export type CreatePurchaseOrderParams = z.infer<typeof createPurchaseOrderSchema>;

export const createPurchaseOrderOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createPurchaseOrder",
            name: "Create Purchase Order",
            description: "Create a new purchase order in SAP S/4HANA",
            category: "erp",
            actionType: "write",
            inputSchema: createPurchaseOrderSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create createPurchaseOrderOperation"
        );
        throw new Error(
            `Failed to create createPurchaseOrder operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreatePurchaseOrder(
    client: SapClient,
    params: CreatePurchaseOrderParams
): Promise<OperationResult> {
    try {
        const response = await client.createPurchaseOrder(params);

        return {
            success: true,
            data: response.d
        };
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
