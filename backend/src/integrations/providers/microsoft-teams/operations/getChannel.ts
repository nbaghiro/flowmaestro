import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const getChannelSchema = z.object({
    teamId: z.string().describe("ID of the team"),
    channelId: z.string().describe("ID of the channel")
});

export type GetChannelParams = z.infer<typeof getChannelSchema>;

export const getChannelOperation: OperationDefinition = {
    id: "getChannel",
    name: "Get Channel",
    description: "Get details of a specific channel",
    category: "channels",
    inputSchema: getChannelSchema,
    retryable: true
};

export async function executeGetChannel(
    client: MicrosoftTeamsClient,
    params: GetChannelParams
): Promise<OperationResult> {
    try {
        const result = await client.getChannel(params.teamId, params.channelId);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get channel",
                retryable: true
            }
        };
    }
}
