import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Conference Records operation schema
 */
export const listConferenceRecordsSchema = z.object({
    filter: z
        .string()
        .optional()
        .describe(
            "Filter expression for conference records, " + 'e.g. "space.name=spaces/abc-defg-hij"'
        ),
    pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of records to return (1-100)"),
    pageToken: z.string().optional().describe("Page token for pagination")
});

export type ListConferenceRecordsParams = z.infer<typeof listConferenceRecordsSchema>;

/**
 * List Conference Records operation definition
 */
export const listConferenceRecordsOperation: OperationDefinition = {
    id: "listConferenceRecords",
    name: "List Conference Records",
    description: "List conference records for completed or ongoing meetings",
    category: "conferenceRecords",
    actionType: "read",
    inputSchema: listConferenceRecordsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list conference records operation
 */
export async function executeListConferenceRecords(
    client: GoogleMeetClient,
    params: ListConferenceRecordsParams
): Promise<OperationResult> {
    try {
        const response = await client.listConferenceRecords({
            filter: params.filter,
            pageSize: params.pageSize,
            pageToken: params.pageToken
        });

        return {
            success: true,
            data: {
                conferenceRecords: (response.conferenceRecords || []).map((record) => ({
                    name: record.name,
                    startTime: record.startTime,
                    endTime: record.endTime,
                    expireTime: record.expireTime,
                    space: record.space
                })),
                nextPageToken: response.nextPageToken
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list conference records",
                retryable: true
            }
        };
    }
}
