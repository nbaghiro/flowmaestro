import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PowerBIClient } from "../client/PowerBIClient";

/**
 * Get dashboard input schema
 */
export const getDashboardSchema = z.object({
    dashboardId: z.string().min(1).describe("Dashboard ID (GUID)"),
    workspaceId: z
        .string()
        .optional()
        .describe("Workspace ID (GUID). If not provided, looks in 'My Workspace'")
});

export type GetDashboardParams = z.infer<typeof getDashboardSchema>;

/**
 * Get dashboard operation definition
 */
export const getDashboardOperation: OperationDefinition = {
    id: "getDashboard",
    name: "Get Dashboard",
    description: "Get details of a specific dashboard",
    category: "data",
    retryable: true,
    inputSchema: getDashboardSchema
};

/**
 * Execute get dashboard operation
 */
export async function executeGetDashboard(
    client: PowerBIClient,
    params: GetDashboardParams
): Promise<OperationResult> {
    try {
        const response = await client.getDashboard(params.dashboardId, params.workspaceId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get dashboard",
                retryable: true
            }
        };
    }
}
