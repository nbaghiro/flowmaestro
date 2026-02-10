import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getMaterialSchema = z.object({
    materialId: z.string().min(1).describe("The material/product ID")
});

export type GetMaterialParams = z.infer<typeof getMaterialSchema>;

export const getMaterialOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getMaterial",
            name: "Get Material",
            description: "Get a material/product by ID from SAP S/4HANA",
            category: "erp",
            actionType: "read",
            inputSchema: getMaterialSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "SAP", err: error }, "Failed to create getMaterialOperation");
        throw new Error(
            `Failed to create getMaterial operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetMaterial(
    client: SapClient,
    params: GetMaterialParams
): Promise<OperationResult> {
    try {
        const response = await client.getMaterial(params.materialId);

        return {
            success: true,
            data: response.d
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get material",
                retryable: false
            }
        };
    }
}
