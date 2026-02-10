import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Participants operation schema
 */
export const listParticipantsSchema = z.object({
    conferenceRecordName: z
        .string()
        .describe(
            "Full resource name of the conference record, " + 'e.g. "conferenceRecords/xyz789"'
        ),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of participants to return (1-100)"),
    pageToken: z.string().optional().describe("Page token for pagination"),
    filter: z
        .string()
        .optional()
        .describe(
            "Filter expression for participants, " + 'e.g. "latest_end_time IS NULL" for active'
        )
});

export type ListParticipantsParams = z.infer<typeof listParticipantsSchema>;

/**
 * List Participants operation definition
 */
export const listParticipantsOperation: OperationDefinition = {
    id: "listParticipants",
    name: "List Participants",
    description: "List participants of a conference record",
    category: "participants",
    actionType: "read",
    inputSchema: listParticipantsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list participants operation
 */
export async function executeListParticipants(
    client: GoogleMeetClient,
    params: ListParticipantsParams
): Promise<OperationResult> {
    try {
        const response = await client.listParticipants(params.conferenceRecordName, {
            pageSize: params.pageSize,
            pageToken: params.pageToken,
            filter: params.filter
        });

        return {
            success: true,
            data: {
                participants: (response.participants || []).map((participant) => ({
                    name: participant.name,
                    earliestStartTime: participant.earliestStartTime,
                    latestEndTime: participant.latestEndTime,
                    signedinUser: participant.signedinUser,
                    anonymousUser: participant.anonymousUser,
                    phoneUser: participant.phoneUser
                })),
                nextPageToken: response.nextPageToken,
                totalSize: response.totalSize
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list participants",
                retryable: true
            }
        };
    }
}
