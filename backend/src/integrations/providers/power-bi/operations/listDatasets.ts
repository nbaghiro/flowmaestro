import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * List datasets input schema
 */
export const listDatasetsSchema = z.object({
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, lists datasets from 'My Workspace'")
});

export type ListDatasetsParams = z.infer<typeof listDatasetsSchema>;

/**
 * List datasets operation definition
 */
export const listDatasetsOperation: OperationDefinition = {
    id: "listDatasets",
    name: "List Datasets",
    description: "List all datasets in a workspace",
    category: "data",
    retryable: true,
    inputSchema: listDatasetsSchema
};

/**
 * Execute list datasets operation
 */
export async function executeListDatasets(
    client: PowerBIClient,
    params: ListDatasetsParams
): Promise<OperationResult> {
    try {
        const response = await client.listDatasets(params.workspaceId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list datasets",
                retryable: true
            }
        };
    }
}
