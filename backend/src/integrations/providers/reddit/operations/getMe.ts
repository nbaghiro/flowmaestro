import { z } from "zod";
import { createServiceLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { RedditClient } from "../client/RedditClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = createServiceLogger("Reddit");

/**
 * Get Me operation schema (no inputs required)
 */
export const getMeSchema = z.object({});

export type GetMeParams = z.infer<typeof getMeSchema>;

/**
 * Get Me operation definition
 */
export const getMeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getMe",
            name: "Get Current User",
            description: "Get information about the authenticated Reddit user.",
            category: "user",
            inputSchema: getMeSchema,
            inputSchemaJSON: toJSONSchema(getMeSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create getMeOperation");
        throw new Error(
            `Failed to create getMe operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get me operation
 */
export async function executeGetMe(
    client: RedditClient,
    _params: GetMeParams
): Promise<OperationResult> {
    try {
        const user = await client.getMe();

        return {
            success: true,
            data: {
                id: user.id,
                username: user.name,
                displayName: `u/${user.name}`,
                linkKarma: user.link_karma,
                commentKarma: user.comment_karma,
                totalKarma: user.total_karma,
                isGold: user.is_gold,
                isMod: user.is_mod,
                hasVerifiedEmail: user.has_verified_email,
                iconImg: user.icon_img,
                createdUtc: user.created_utc
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user info",
                retryable: true
            }
        };
    }
}
