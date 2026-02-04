import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { ZoomRecordingList } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Recordings operation schema
 */
export const listRecordingsSchema = z.object({
    from: z.string().optional().describe("Start date in yyyy-MM-dd format (e.g., '2024-06-01')"),
    to: z.string().optional().describe("End date in yyyy-MM-dd format (e.g., '2024-06-30')"),
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

export type ListRecordingsParams = z.infer<typeof listRecordingsSchema>;

/**
 * List Recordings operation definition
 */
export const listRecordingsOperation: OperationDefinition = {
    id: "listRecordings",
    name: "List Recordings",
    description: "List cloud recordings for the authenticated user",
    category: "recordings",
    actionType: "read",
    inputSchema: listRecordingsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list recordings operation
 */
export async function executeListRecordings(
    client: ZoomClient,
    params: ListRecordingsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            page_size: params.page_size
        };

        if (params.from) {
            queryParams.from = params.from;
        }
        if (params.to) {
            queryParams.to = params.to;
        }
        if (params.next_page_token) {
            queryParams.next_page_token = params.next_page_token;
        }

        const response = await client.get<ZoomRecordingList>("/users/me/recordings", queryParams);

        const recordings = (response.meetings || []).map((r) => ({
            uuid: r.uuid,
            id: r.id,
            hostId: r.host_id,
            topic: r.topic,
            type: r.type,
            startTime: r.start_time,
            timezone: r.timezone,
            duration: r.duration,
            totalSize: r.total_size,
            recordingCount: r.recording_count,
            shareUrl: r.share_url,
            recordingFiles: (r.recording_files || []).map((f) => ({
                id: f.id,
                meetingId: f.meeting_id,
                recordingStart: f.recording_start,
                recordingEnd: f.recording_end,
                fileType: f.file_type,
                fileExtension: f.file_extension,
                fileSize: f.file_size,
                downloadUrl: f.download_url,
                playUrl: f.play_url,
                status: f.status,
                recordingType: f.recording_type
            }))
        }));

        return {
            success: true,
            data: {
                recordings,
                from: response.from,
                to: response.to,
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
                message: error instanceof Error ? error.message : "Failed to list recordings",
                retryable: true
            }
        };
    }
}
