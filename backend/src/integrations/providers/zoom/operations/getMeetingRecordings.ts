import { z } from "zod";
import { ZoomClient } from "../client/ZoomClient";
import type { ZoomRecording } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Meeting Recordings operation schema
 */
export const getMeetingRecordingsSchema = z.object({
    meetingId: z.union([z.string(), z.number()]).describe("Zoom meeting ID to get recordings for")
});

export type GetMeetingRecordingsParams = z.infer<typeof getMeetingRecordingsSchema>;

/**
 * Get Meeting Recordings operation definition
 */
export const getMeetingRecordingsOperation: OperationDefinition = {
    id: "getMeetingRecordings",
    name: "Get Meeting Recordings",
    description: "Retrieve recordings for a specific Zoom meeting",
    category: "recordings",
    actionType: "read",
    inputSchema: getMeetingRecordingsSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get meeting recordings operation
 */
export async function executeGetMeetingRecordings(
    client: ZoomClient,
    params: GetMeetingRecordingsParams
): Promise<OperationResult> {
    try {
        const response = await client.get<ZoomRecording>(
            `/meetings/${params.meetingId}/recordings`
        );

        return {
            success: true,
            data: {
                uuid: response.uuid,
                id: response.id,
                hostId: response.host_id,
                topic: response.topic,
                type: response.type,
                startTime: response.start_time,
                timezone: response.timezone,
                duration: response.duration,
                totalSize: response.total_size,
                recordingCount: response.recording_count,
                shareUrl: response.share_url,
                password: response.password,
                recordingFiles: (response.recording_files || []).map((f) => ({
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
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get meeting recordings",
                retryable: true
            }
        };
    }
}
