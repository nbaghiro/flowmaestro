import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseActivity, CloseListResponse } from "../types";

/**
 * List Activities Parameters
 */
export const listActivitiesSchema = z.object({
    _skip: z.number().int().min(0).optional().default(0).describe("Number of items to skip"),
    _limit: z.number().int().min(1).max(100).optional().default(50).describe("Items per page"),
    lead_id: z.string().optional().describe("Filter by lead ID"),
    user_id: z.string().optional().describe("Filter by user ID"),
    _type: z
        .enum(["Call", "Email", "Note", "Meeting", "SMS"])
        .optional()
        .describe("Filter by activity type"),
    _fields: z.array(z.string()).optional().describe("Fields to include in response")
});

export type ListActivitiesParams = z.infer<typeof listActivitiesSchema>;

/**
 * Operation Definition
 */
export const listActivitiesOperation: OperationDefinition = {
    id: "listActivities",
    name: "List Activities",
    description: "Get activities (calls, emails, notes, meetings) with optional filtering",
    category: "activities",
    inputSchema: listActivitiesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Activities
 */
export async function executeListActivities(
    client: CloseClient,
    params: ListActivitiesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            _skip: params._skip,
            _limit: params._limit
        };

        if (params.lead_id) {
            queryParams.lead_id = params.lead_id;
        }
        if (params.user_id) {
            queryParams.user_id = params.user_id;
        }
        if (params._type) {
            queryParams._type = params._type;
        }
        if (params._fields && params._fields.length > 0) {
            queryParams._fields = params._fields.join(",");
        }

        const response = await client.get<CloseListResponse<CloseActivity>>(
            "/activity/",
            queryParams
        );

        return {
            success: true,
            data: {
                activities: response.data,
                has_more: response.has_more,
                total_results: response.total_results
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
