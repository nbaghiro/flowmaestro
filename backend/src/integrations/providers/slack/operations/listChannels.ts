import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { SlackClient } from "../client/SlackClient";
import type { SlackConversationsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Channels operation schema
 */
export const listChannelsSchema = z.object({
    excludeArchived: z.boolean().optional().default(true).describe("Exclude archived channels"),
    limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe("Number of channels to return")
});

export type ListChannelsParams = z.infer<typeof listChannelsSchema>;

/**
 * List Channels operation definition
 */
export const listChannelsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listChannels",
            name: "List Channels",
            description: "List all channels in the Slack workspace",
            category: "channels",
            inputSchema: listChannelsSchema,
            inputSchemaJSON: toJSONSchema(listChannelsSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Slack", err: error }, "Failed to create listChannelsOperation");
        throw new Error(
            `Failed to create listChannels operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list channels operation
 */
export async function executeListChannels(
    client: SlackClient,
    params: ListChannelsParams
): Promise<OperationResult> {
    try {
        const response = await client.listConversations({
            types: "public_channel,private_channel",
            exclude_archived: params.excludeArchived,
            limit: params.limit
        });

        const data = response as SlackConversationsResponse;

        const channels = data.channels.map((ch) => ({
            id: ch.id,
            name: ch.name,
            isPrivate: ch.is_private,
            isArchived: ch.is_archived,
            memberCount: ch.num_members || 0
        }));

        return {
            success: true,
            data: {
                channels,
                nextCursor: data.response_metadata?.next_cursor
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
