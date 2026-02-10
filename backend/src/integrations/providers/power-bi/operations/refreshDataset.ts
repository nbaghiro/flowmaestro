import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * Refresh dataset input schema
 */
export const refreshDatasetSchema = z.object({
    datasetId: z.string().min(1).describe("Dataset ID (GUID)"),
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, uses 'My Workspace'"),
    notifyOption: z
        .enum(["MailOnCompletion", "MailOnFailure", "NoNotification"])
        .optional()
        .describe("Email notification option for refresh completion")
});

export type RefreshDatasetParams = z.infer<typeof refreshDatasetSchema>;

/**
 * Refresh dataset operation definition
 */
export const refreshDatasetOperation: OperationDefinition = {
    id: "refreshDataset",
    name: "Refresh Dataset",
    description: "Trigger a dataset refresh",
    category: "data",
    retryable: false,
    inputSchema: refreshDatasetSchema
};

/**
 * Execute refresh dataset operation
 */
export async function executeRefreshDataset(
    client: PowerBIClient,
    params: RefreshDatasetParams
): Promise<OperationResult> {
    try {
        const response = await client.refreshDataset({
            datasetId: params.datasetId,
            workspaceId: params.workspaceId,
            notifyOption: params.notifyOption
        });

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to refresh dataset",
                retryable: false
            }
        };
    }
}
