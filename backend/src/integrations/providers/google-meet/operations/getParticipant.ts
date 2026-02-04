import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Participant operation schema
 */
export const getParticipantSchema = z.object({
    name: z
        .string()
        .describe(
            "Full resource name of the participant, e.g. " +
                '"conferenceRecords/xyz789/participants/p1"'
        )
});

export type GetParticipantParams = z.infer<typeof getParticipantSchema>;

/**
 * Get Participant operation definition
 */
export const getParticipantOperation: OperationDefinition = {
    id: "getParticipant",
    name: "Get Participant",
    description: "Retrieve details of a specific conference participant",
    category: "participants",
    actionType: "read",
    inputSchema: getParticipantSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get participant operation
 */
export async function executeGetParticipant(
    client: GoogleMeetClient,
    params: GetParticipantParams
): Promise<OperationResult> {
    try {
        const response = await client.getParticipant(params.name);

        return {
            success: true,
            data: {
                name: response.name,
                earliestStartTime: response.earliestStartTime,
                latestEndTime: response.latestEndTime,
                signedinUser: response.signedinUser,
                anonymousUser: response.anonymousUser,
                phoneUser: response.phoneUser
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get participant",
                retryable: true
            }
        };
    }
}
