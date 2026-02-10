import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * Get dataset input schema
 */
export const getDatasetSchema = z.object({
    datasetId: z.string().min(1).describe("Dataset ID (GUID)"),
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, looks in 'My Workspace'")
});

export type GetDatasetParams = z.infer<typeof getDatasetSchema>;

/**
 * Get dataset operation definition
 */
export const getDatasetOperation: OperationDefinition = {
    id: "getDataset",
    name: "Get Dataset",
    description: "Get details of a specific dataset",
    category: "data",
    retryable: true,
    inputSchema: getDatasetSchema
};

/**
 * Execute get dataset operation
 */
export async function executeGetDataset(
    client: PowerBIClient,
    params: GetDatasetParams
): Promise<OperationResult> {
    try {
        const response = await client.getDataset(params.datasetId, params.workspaceId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get dataset",
                retryable: true
            }
        };
    }
}
