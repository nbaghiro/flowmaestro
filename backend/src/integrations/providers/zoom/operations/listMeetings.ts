import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { ZoomMeetingList } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Meetings operation schema
 */
export const listMeetingsSchema = z.object({
    type: z
        .enum(["scheduled", "live", "upcoming", "previous_meetings"])
        .optional()
        .describe("Meeting type filter: scheduled, live, upcoming, " + "or previous_meetings"),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(300)
        .optional()
        .default(30)
        .describe("Number of results per page (max 300)"),
    next_page_token: z.string().optional().describe("Token for next page of results")
});

export type ListMeetingsParams = z.infer<typeof listMeetingsSchema>;

/**
 * List Meetings operation definition
 */
export const listMeetingsOperation: OperationDefinition = {
    id: "listMeetings",
    name: "List Meetings",
    description: "List all meetings for the authenticated user",
    category: "meetings",
    actionType: "read",
    inputSchema: listMeetingsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list meetings operation
 */
export async function executeListMeetings(
    client: ZoomClient,
    params: ListMeetingsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page_size: params.page_size
        };

        if (params.type) {
            queryParams.type = params.type;
        }
        if (params.next_page_token) {
            queryParams.next_page_token = params.next_page_token;
        }

        const response = await client.get<ZoomMeetingList>("/users/me/meetings", queryParams);

        const meetings = (response.meetings || []).map((m) => ({
            id: m.id,
            uuid: m.uuid,
            hostId: m.host_id,
            topic: m.topic,
            type: m.type,
            status: m.status,
            startTime: m.start_time,
            duration: m.duration,
            timezone: m.timezone,
            createdAt: m.created_at,
            joinUrl: m.join_url
        }));

        return {
            success: true,
            data: {
                meetings,
                pageCount: response.page_count,
                pageSize: response.page_size,
                totalRecords: response.total_records,
                nextPageToken: response.next_page_token
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list meetings",
                retryable: true
            }
        };
    }
}
