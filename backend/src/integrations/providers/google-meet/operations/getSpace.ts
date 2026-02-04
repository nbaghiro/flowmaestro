import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Space operation schema
 */
export const getSpaceSchema = z.object({
    name: z
        .string()
        .describe(
            'Resource name of the space, e.g. "spaces/abc-defg-hij" ' +
                'or just the ID "abc-defg-hij"'
        )
});

export type GetSpaceParams = z.infer<typeof getSpaceSchema>;

/**
 * Get Space operation definition
 */
export const getSpaceOperation: OperationDefinition = {
    id: "getSpace",
    name: "Get Space",
    description: "Retrieve details of a Google Meet meeting space",
    category: "spaces",
    actionType: "read",
    inputSchema: getSpaceSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get space operation
 */
export async function executeGetSpace(
    client: GoogleMeetClient,
    params: GetSpaceParams
): Promise<OperationResult> {
    try {
        const response = await client.getSpace(params.name);

        return {
            success: true,
            data: {
                name: response.name,
                meetingUri: response.meetingUri,
                meetingCode: response.meetingCode,
                config: response.config,
                activeConference: response.activeConference
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get meeting space",
                retryable: true
            }
        };
    }
}
