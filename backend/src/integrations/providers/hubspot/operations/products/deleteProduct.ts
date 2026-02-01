import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Delete Product Parameters
 */
export const deleteProductSchema = z.object({
    productId: z.string()
});

export type DeleteProductParams = z.infer<typeof deleteProductSchema>;

/**
 * Operation Definition
 */
export const deleteProductOperation: OperationDefinition = {
    id: "deleteProduct",
    name: "Delete Product",
    description: "Delete (archive) a product in HubSpot CRM",
    category: "crm",
    inputSchema: deleteProductSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Product
 */
export async function executeDeleteProduct(
    client: HubspotClient,
    params: DeleteProductParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/products/${params.productId}`);

        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete product",
                retryable: false
            }
        };
    }
}
