import { z } from "zod";
import type { DiscordGuild } from "@flowmaestro/shared";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { DiscordClient } from "../client/DiscordClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Guilds operation schema
 * No parameters needed - uses OAuth2 token to get user's guilds
 */
export const listGuildsSchema = z.object({});

export type ListGuildsParams = z.infer<typeof listGuildsSchema>;

/**
 * List Guilds operation definition
 */
export const listGuildsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listGuilds",
            name: "List Guilds",
            description: "List Discord servers (guilds) the connected user is a member of",
            category: "discovery",
            inputSchema: listGuildsSchema,
            inputSchemaJSON: toJSONSchema(listGuildsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Discord", err: error }, "Failed to create listGuildsOperation");
        throw new Error(
            `Failed to create listGuilds operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list guilds operation
 */
export async function executeListGuilds(
    client: DiscordClient,
    _params: ListGuildsParams
): Promise<OperationResult> {
    try {
        const guilds = await client.getCurrentUserGuilds();

        // Transform to simpler format
        const guildList = guilds.map((guild: DiscordGuild) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            owner: guild.owner,
            permissions: guild.permissions
        }));

        return {
            success: true,
            data: {
                guilds: guildList,
                count: guildList.length
            }
        };
    } catch (error) {
        logger.error({ component: "Discord", err: error }, "Failed to list Discord guilds");
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list guilds",
                retryable: true
            }
        };
    }
}
