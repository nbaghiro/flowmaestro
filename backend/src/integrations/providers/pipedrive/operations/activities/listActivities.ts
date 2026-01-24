import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveListResponse, PipedriveActivity } from "../types";

/**
 * List Activities Parameters
 */
export const listActivitiesSchema = z.object({
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page"),
    user_id: z.number().int().optional().describe("Filter by owner user ID"),
    type: z.string().optional().describe("Filter by activity type (call, meeting, task, etc.)"),
    done: z.enum(["0", "1"]).optional().describe("Filter by completion status (0=undone, 1=done)"),
    start_date: z.string().optional().describe("Filter activities from this date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("Filter activities until this date (YYYY-MM-DD)")
});

export type ListActivitiesParams = z.infer<typeof listActivitiesSchema>;

/**
 * Operation Definition
 */
export const listActivitiesOperation: OperationDefinition = {
    id: "listActivities",
    name: "List Activities",
    description: "Get all activities (calls, meetings, tasks) with optional filtering",
    category: "activities",
    inputSchema: listActivitiesSchema,
    inputSchemaJSON: toJSONSchema(listActivitiesSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Activities
 */
export async function executeListActivities(
    client: PipedriveClient,
    params: ListActivitiesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            start: params.start,
            limit: params.limit
        };

        if (params.user_id !== undefined) {
            queryParams.user_id = params.user_id;
        }
        if (params.type) {
            queryParams.type = params.type;
        }
        if (params.done !== undefined) {
            queryParams.done = params.done;
        }
        if (params.start_date) {
            queryParams.start_date = params.start_date;
        }
        if (params.end_date) {
            queryParams.end_date = params.end_date;
        }

        const response = await client.get<PipedriveListResponse<PipedriveActivity>>(
            "/activities",
            queryParams
        );

        return {
            success: true,
            data: {
                activities: response.data || [],
                pagination: response.additional_data?.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list activities",
                retryable: true
            }
        };
    }
}
