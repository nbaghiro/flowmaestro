import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Time Off Activities operation schema
 */
export const listTimeOffActivitiesSchema = z.object({
    employeeUuid: z.string().describe("The Gusto employee UUID")
});

export type ListTimeOffActivitiesParams = z.infer<typeof listTimeOffActivitiesSchema>;

/**
 * List Time Off Activities operation definition
 */
export const listTimeOffActivitiesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTimeOffActivities",
            name: "List Time Off Activities",
            description: "List time off activities for a specific employee in Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: listTimeOffActivitiesSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Gusto", err: error },
            "Failed to create listTimeOffActivitiesOperation"
        );
        throw new Error(
            `Failed to create listTimeOffActivities operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list time off activities operation
 */
export async function executeListTimeOffActivities(
    client: GustoClient,
    params: ListTimeOffActivitiesParams
): Promise<OperationResult> {
    try {
        const activities = await client.listTimeOffActivities(params.employeeUuid);

        return {
            success: true,
            data: {
                timeOffActivities: activities.map((activity) => ({
                    uuid: activity.uuid,
                    employeeUuid: activity.employee_uuid,
                    policyUuid: activity.policy_uuid,
                    policyName: activity.policy_name,
                    eventType: activity.event_type,
                    hours: activity.hours,
                    effectiveDate: activity.effective_date
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list time off activities",
                retryable: true
            }
        };
    }
}
