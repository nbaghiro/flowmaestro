import { z } from "zod";
import { GoogleMeetClient } from "../client/GoogleMeetClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Update Space operation schema
 */
export const updateSpaceSchema = z.object({
    name: z
        .string()
        .describe(
            'Resource name of the space, e.g. "spaces/abc-defg-hij" ' +
                'or just the ID "abc-defg-hij"'
        ),
    config: z
        .object({
            accessType: z
                .enum(["ACCESS_TYPE_UNSPECIFIED", "OPEN", "TRUSTED", "RESTRICTED"])
                .optional()
                .describe("Access type for the meeting space"),
            entryPointAccess: z
                .enum(["ENTRY_POINT_ACCESS_UNSPECIFIED", "ALL", "CREATOR_APP_ONLY"])
                .optional()
                .describe("Entry point access setting for the space")
        })
        .describe("Space configuration to update"),
    updateMask: z
        .string()
        .optional()
        .describe(
            "Comma-separated field mask, e.g. " + '"config.accessType,config.entryPointAccess"'
        )
});

export type UpdateSpaceParams = z.infer<typeof updateSpaceSchema>;

/**
 * Update Space operation definition
 */
export const updateSpaceOperation: OperationDefinition = {
    id: "updateSpace",
    name: "Update Space",
    description: "Update the configuration of a Google Meet meeting space",
    category: "spaces",
    actionType: "write",
    inputSchema: updateSpaceSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute update space operation
 */
export async function executeUpdateSpace(
    client: GoogleMeetClient,
    params: UpdateSpaceParams
): Promise<OperationResult> {
    try {
        // Build updateMask from config fields if not provided
        let updateMask = params.updateMask;
        if (!updateMask) {
            const fields: string[] = [];
            if (params.config.accessType !== undefined) {
                fields.push("config.accessType");
            }
            if (params.config.entryPointAccess !== undefined) {
                fields.push("config.entryPointAccess");
            }
            updateMask = fields.join(",");
        }

        const response = await client.updateSpace(params.name, params.config, updateMask);

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
                message: error instanceof Error ? error.message : "Failed to update meeting space",
                retryable: true
            }
        };
    }
}
