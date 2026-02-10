import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Space operation schema
 */
export const createSpaceSchema = z.object({
    accessType: z
        .enum(["ACCESS_TYPE_UNSPECIFIED", "OPEN", "TRUSTED", "RESTRICTED"])
        .optional()
        .describe("Access type for the meeting space"),
    entryPointAccess: z
        .enum(["ENTRY_POINT_ACCESS_UNSPECIFIED", "ALL", "CREATOR_APP_ONLY"])
        .optional()
        .describe("Entry point access setting for the space")
});

export type CreateSpaceParams = z.infer<typeof createSpaceSchema>;

/**
 * Create Space operation definition
 */
export const createSpaceOperation: OperationDefinition = {
    id: "createSpace",
    name: "Create Space",
    description: "Create a new Google Meet meeting space",
    category: "spaces",
    actionType: "write",
    inputSchema: createSpaceSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute create space operation
 */
export async function executeCreateSpace(
    client: GoogleMeetClient,
    params: CreateSpaceParams
): Promise<OperationResult> {
    try {
        const config: Record<string, string> = {};
        if (params.accessType) {
            config.accessType = params.accessType;
        }
        if (params.entryPointAccess) {
            config.entryPointAccess = params.entryPointAccess;
        }

        const hasConfig = Object.keys(config).length > 0;
        const response = await client.createSpace(hasConfig ? config : undefined);

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
                message: error instanceof Error ? error.message : "Failed to create meeting space",
                retryable: true
            }
        };
    }
}
