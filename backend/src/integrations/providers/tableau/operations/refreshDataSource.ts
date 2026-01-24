import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TableauClient } from "../client/TableauClient";
import { TableauDataSourceIdSchema } from "./schemas";
import type { TableauJobResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Refresh Data Source operation schema
 */
export const refreshDataSourceSchema = z.object({
    datasource_id: TableauDataSourceIdSchema
});

export type RefreshDataSourceParams = z.infer<typeof refreshDataSourceSchema>;

/**
 * Refresh Data Source operation definition
 */
export const refreshDataSourceOperation: OperationDefinition = {
    id: "refreshDataSource",
    name: "Refresh Data Source",
    description: "Trigger a refresh for a data source extract",
    category: "datasources",
    actionType: "write",
    inputSchema: refreshDataSourceSchema,
    inputSchemaJSON: toJSONSchema(refreshDataSourceSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute refresh data source operation
 */
export async function executeRefreshDataSource(
    client: TableauClient,
    params: RefreshDataSourceParams
): Promise<OperationResult> {
    try {
        const response = await client.post<TableauJobResponse>(
            client.makeSitePath(`/datasources/${params.datasource_id}/refresh`),
            {}
        );

        return {
            success: true,
            data: {
                job_id: response.job.id,
                mode: response.job.mode,
                type: response.job.type,
                progress: response.job.progress,
                created_at: response.job.createdAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to refresh data source",
                retryable: true
            }
        };
    }
}
