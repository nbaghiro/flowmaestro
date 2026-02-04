import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Conference Record operation schema
 */
export const getConferenceRecordSchema = z.object({
    name: z
        .string()
        .describe(
            "Full resource name of the conference record, " + 'e.g. "conferenceRecords/xyz789"'
        )
});

export type GetConferenceRecordParams = z.infer<typeof getConferenceRecordSchema>;

/**
 * Get Conference Record operation definition
 */
export const getConferenceRecordOperation: OperationDefinition = {
    id: "getConferenceRecord",
    name: "Get Conference Record",
    description: "Retrieve details of a specific conference record",
    category: "conferenceRecords",
    actionType: "read",
    inputSchema: getConferenceRecordSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get conference record operation
 */
export async function executeGetConferenceRecord(
    client: GoogleMeetClient,
    params: GetConferenceRecordParams
): Promise<OperationResult> {
    try {
        const response = await client.getConferenceRecord(params.name);

        return {
            success: true,
            data: {
                name: response.name,
                startTime: response.startTime,
                endTime: response.endTime,
                expireTime: response.expireTime,
                space: response.space
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get conference record",
                retryable: true
            }
        };
    }
}
