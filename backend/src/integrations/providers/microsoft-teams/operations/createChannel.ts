import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const createChannelSchema = z.object({
    teamId: z.string().describe("ID of the team"),
    displayName: z.string().max(50).describe("Name of the channel (max 50 characters)"),
    description: z.string().optional().describe("Description of the channel"),
    membershipType: z
        .enum(["standard", "private"])
        .optional()
        .default("standard")
        .describe("Channel membership type")
});

export type CreateChannelParams = z.infer<typeof createChannelSchema>;

export const createChannelOperation: OperationDefinition = {
    id: "createChannel",
    name: "Create Channel",
    description: "Create a new channel in a Microsoft Team",
    category: "channels",
    inputSchema: createChannelSchema,
    retryable: false
};

export async function executeCreateChannel(
    client: MicrosoftTeamsClient,
    params: CreateChannelParams
): Promise<OperationResult> {
    try {
        const result = await client.createChannel(
            params.teamId,
            params.displayName,
            params.description,
            params.membershipType
        );
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create channel",
                retryable: false
            }
        };
    }
}
