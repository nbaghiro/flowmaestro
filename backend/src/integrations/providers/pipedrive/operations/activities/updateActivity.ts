import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveActivity } from "../types";

/**
 * Update Activity Parameters
 */
export const updateActivitySchema = z.object({
    id: z.number().int().describe("The activity ID to update"),
    subject: z.string().min(1).optional().describe("Activity subject"),
    type: z
        .string()
        .optional()
        .describe("Activity type (call, meeting, task, deadline, email, lunch, etc.)"),
    done: z.enum(["0", "1"]).optional().describe("Completion status (0=undone, 1=done)"),
    due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
    due_time: z.string().optional().describe("Due time (HH:MM)"),
    duration: z.string().optional().describe("Duration (HH:MM)"),
    user_id: z.number().int().optional().describe("Owner user ID"),
    deal_id: z.number().int().optional().describe("Linked deal ID"),
    person_id: z.number().int().optional().describe("Linked person ID"),
    org_id: z.number().int().optional().describe("Linked organization ID"),
    lead_id: z.string().uuid().optional().describe("Linked lead UUID"),
    note: z.string().optional().describe("Additional notes"),
    location: z.string().optional().describe("Activity location"),
    public_description: z.string().optional().describe("Public description (for calendar sync)"),
    busy_flag: z.boolean().optional().describe("Mark as busy in calendar")
});

export type UpdateActivityParams = z.infer<typeof updateActivitySchema>;

/**
 * Operation Definition
 */
export const updateActivityOperation: OperationDefinition = {
    id: "updateActivity",
    name: "Update Activity",
    description: "Update an existing activity",
    category: "activities",
    inputSchema: updateActivitySchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Update Activity
 */
export async function executeUpdateActivity(
    client: PipedriveClient,
    params: UpdateActivityParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<PipedriveResponse<PipedriveActivity>>(
            `/activities/${id}`,
            updateData
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to update activity",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update activity",
                retryable: false
            }
        };
    }
}
