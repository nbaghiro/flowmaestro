import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * List dashboards input schema
 */
export const listDashboardsSchema = z.object({
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, lists dashboards from 'My Workspace'")
});

export type ListDashboardsParams = z.infer<typeof listDashboardsSchema>;

/**
 * List dashboards operation definition
 */
export const listDashboardsOperation: OperationDefinition = {
    id: "listDashboards",
    name: "List Dashboards",
    description: "List all dashboards in a workspace",
    category: "data",
    retryable: true,
    inputSchema: listDashboardsSchema
};

/**
 * Execute list dashboards operation
 */
export async function executeListDashboards(
    client: PowerBIClient,
    params: ListDashboardsParams
): Promise<OperationResult> {
    try {
        const response = await client.listDashboards(params.workspaceId);

        return {
            success: true,
            data: response
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
