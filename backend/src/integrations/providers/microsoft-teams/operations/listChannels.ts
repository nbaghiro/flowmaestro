import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const listChannelsSchema = z.object({
    teamId: z.string().describe("ID of the team")
});

export type ListChannelsParams = z.infer<typeof listChannelsSchema>;

export const listChannelsOperation: OperationDefinition = {
    id: "listChannels",
    name: "List Channels",
    description: "List all channels in a Microsoft Team",
    category: "channels",
    inputSchema: listChannelsSchema,
    retryable: true
};

export async function executeListChannels(
    client: MicrosoftTeamsClient,
    params: ListChannelsParams
): Promise<OperationResult> {
    try {
        const result = await client.listChannels(params.teamId);
        return {
            success: true,
            data: {
                channels: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list channels",
                retryable: true
            }
        };
    }
}
