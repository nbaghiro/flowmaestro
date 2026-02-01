import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { TwitterClient } from "../client/TwitterClient";
import { UsernameSchema } from "../schemas";
import type { XAPIResponse, XUser } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get User operation schema
 */
export const getUserSchema = z.object({
    username: UsernameSchema.optional().describe(
        "Username to look up (without @). If not provided, returns the authenticated user."
    )
});

export type GetUserParams = z.infer<typeof getUserSchema>;

/**
 * Get User operation definition
 */
export const getUserOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getUser",
            name: "Get User",
            description:
                "Get user profile information. Returns the authenticated user if no username is provided.",
            category: "users",
            inputSchema: getUserSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Twitter", err: error }, "Failed to create getUserOperation");
        throw new Error(
            `Failed to create getUser operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get user operation
 */
export async function executeGetUser(
    client: TwitterClient,
    params: GetUserParams
): Promise<OperationResult> {
    try {
        const userFields = [
            "id",
            "name",
            "username",
            "description",
            "profile_image_url",
            "created_at",
            "public_metrics",
            "verified",
            "protected"
        ];

        let response: XAPIResponse<XUser>;

        if (params.username) {
            // Look up by username
            response = (await client.getUserByUsername(
                params.username,
                userFields
            )) as XAPIResponse<XUser>;
        } else {
            // Get authenticated user
            response = (await client.getMe(userFields)) as XAPIResponse<XUser>;
        }

        const user = response.data;

        if (!user) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: params.username
                        ? `User @${params.username} not found`
                        : "Unable to get authenticated user",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                username: user.username,
                description: user.description,
                profileImageUrl: user.profile_image_url,
                createdAt: user.created_at,
                isVerified: user.verified,
                isProtected: user.protected,
                metrics: user.public_metrics
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user",
                retryable: true
            }
        };
    }
}
