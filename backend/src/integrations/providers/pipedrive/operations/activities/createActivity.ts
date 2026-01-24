import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveActivity } from "../types";

/**
 * Create Activity Parameters
 */
export const createActivitySchema = z.object({
    subject: z.string().min(1).describe("Activity subject (required)"),
    type: z.string().describe("Activity type (call, meeting, task, deadline, email, lunch, etc.)"),
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

export type CreateActivityParams = z.infer<typeof createActivitySchema>;

/**
 * Operation Definition
 */
export const createActivityOperation: OperationDefinition = {
    id: "createActivity",
    name: "Create Activity",
    description: "Create a new activity (call, meeting, task, etc.)",
    category: "activities",
    inputSchema: createActivitySchema,
    inputSchemaJSON: toJSONSchema(createActivitySchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Activity
 */
export async function executeCreateActivity(
    client: PipedriveClient,
    params: CreateActivityParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PipedriveResponse<PipedriveActivity>>(
            "/activities",
            params
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create activity",
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
                message: error instanceof Error ? error.message : "Failed to create activity",
                retryable: false
            }
        };
    }
}
