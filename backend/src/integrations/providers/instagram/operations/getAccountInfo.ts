import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramAccountResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Account Info operation schema
 */
export const getAccountInfoSchema = z.object({
    igAccountId: z.string().describe("The Instagram Business Account ID")
});

export type GetAccountInfoParams = z.infer<typeof getAccountInfoSchema>;

/**
 * Get Account Info operation definition
 */
export const getAccountInfoOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getAccountInfo",
            name: "Get Account Info",
            description: "Get information about an Instagram Business account",
            category: "account",
            inputSchema: getAccountInfoSchema,
            inputSchemaJSON: toJSONSchema(getAccountInfoSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Instagram", err: error },
            "Failed to create getAccountInfoOperation"
        );
        throw new Error(
            `Failed to create getAccountInfo operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get account info operation
 */
export async function executeGetAccountInfo(
    client: InstagramClient,
    params: GetAccountInfoParams
): Promise<OperationResult> {
    try {
        const account = await client.getAccountInfo(params.igAccountId);

        const data: InstagramAccountResponse = {
            id: account.id,
            username: account.username,
            name: account.name,
            profilePictureUrl: account.profile_picture_url,
            followersCount: account.followers_count,
            followsCount: account.follows_count,
            mediaCount: account.media_count,
            biography: account.biography,
            website: account.website
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get account info",
                retryable: true
            }
        };
    }
}
