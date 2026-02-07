import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { BigQueryClient } from "../client/BigQueryClient";

/**
 * List datasets operation schema
 */
export const listDatasetsSchema = z.object({
    maxResults: z.number().optional().describe("Maximum number of datasets to return")
});

export type ListDatasetsParams = z.infer<typeof listDatasetsSchema>;

/**
 * List datasets operation definition
 */
export const listDatasetsOperation: OperationDefinition = {
    id: "listDatasets",
    name: "List Datasets",
    description: "List all datasets in the BigQuery project",
    category: "database",
    inputSchema: listDatasetsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list datasets operation
 */
export async function executeListDatasets(
    client: BigQueryClient,
    params: ListDatasetsParams
): Promise<OperationResult> {
    try {
        const datasets = await client.listDatasets({
            maxResults: params.maxResults
        });

        return {
            success: true,
            data: {
                datasets,
                count: datasets.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list datasets";

        return {
            success: false,
            error: {
                type: message.includes("permission") ? "permission" : "server_error",
                message,
                retryable: true
            }
        };
    }
}
