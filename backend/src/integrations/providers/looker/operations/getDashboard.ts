import { z } from "zod";
import { LookerClient } from "../client/LookerClient";
import { LookerDashboardIdSchema } from "./schemas";
import type { LookerDashboard } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Dashboard operation schema
 */
export const getDashboardSchema = z.object({
    dashboard_id: LookerDashboardIdSchema
});

export type GetDashboardParams = z.infer<typeof getDashboardSchema>;

/**
 * Get Dashboard operation definition
 */
export const getDashboardOperation: OperationDefinition = {
    id: "getDashboard",
    name: "Get Dashboard",
    description: "Get a specific dashboard by ID with all details including elements and filters",
    category: "dashboards",
    inputSchema: getDashboardSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get dashboard operation
 */
export async function executeGetDashboard(
    client: LookerClient,
    params: GetDashboardParams
): Promise<OperationResult> {
    try {
        const dashboard = await client.get<LookerDashboard>(
            `/dashboards/${encodeURIComponent(params.dashboard_id)}`
        );

        return {
            success: true,
            data: dashboard
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
