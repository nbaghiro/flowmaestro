import { z } from "zod";
import { LookerClient } from "../client/LookerClient";
import { LookerFolderIdSchema, LookerFieldsSchema } from "./schemas";
import type { LookerDashboard } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Dashboards operation schema
 */
export const listDashboardsSchema = z.object({
    folder_id: LookerFolderIdSchema,
    fields: LookerFieldsSchema
});

export type ListDashboardsParams = z.infer<typeof listDashboardsSchema>;

/**
 * List Dashboards operation definition
 */
export const listDashboardsOperation: OperationDefinition = {
    id: "listDashboards",
    name: "List Dashboards",
    description: "Get all dashboards in the Looker instance",
    category: "dashboards",
    inputSchema: listDashboardsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list dashboards operation
 */
export async function executeListDashboards(
    client: LookerClient,
    params: ListDashboardsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.folder_id) {
            queryParams.folder_id = params.folder_id;
        }

        if (params.fields && params.fields.length > 0) {
            queryParams.fields = params.fields.join(",");
        }

        const dashboards = await client.get<LookerDashboard[]>("/dashboards", queryParams);

        return {
            success: true,
            data: {
                dashboards,
                count: dashboards.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list dashboards",
                retryable: true
            }
        };
    }
}
