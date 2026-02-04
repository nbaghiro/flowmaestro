import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * End Active Conference operation schema
 */
export const endActiveConferenceSchema = z.object({
    name: z
        .string()
        .describe(
            'Resource name of the space, e.g. "spaces/abc-defg-hij" ' +
                'or just the ID "abc-defg-hij"'
        )
});

export type EndActiveConferenceParams = z.infer<typeof endActiveConferenceSchema>;

/**
 * End Active Conference operation definition
 */
export const endActiveConferenceOperation: OperationDefinition = {
    id: "endActiveConference",
    name: "End Active Conference",
    description: "End the active conference in a Google Meet space",
    category: "spaces",
    actionType: "write",
    inputSchema: endActiveConferenceSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute end active conference operation
 */
export async function executeEndActiveConference(
    client: GoogleMeetClient,
    params: EndActiveConferenceParams
): Promise<OperationResult> {
    try {
        await client.endActiveConference(params.name);

        return {
            success: true,
            data: {
                ended: true,
                spaceName: params.name
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to end active conference",
                retryable: false
            }
        };
    }
}
