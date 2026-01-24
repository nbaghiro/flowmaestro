import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloMember } from "../types";

/**
 * Get Me operation schema
 */
export const getMeSchema = z.object({});

export type GetMeParams = z.infer<typeof getMeSchema>;

/**
 * Get Me operation definition
 */
export const getMeOperation: OperationDefinition = {
    id: "getMe",
    name: "Get Current User",
    description: "Get information about the current authenticated Trello user",
    category: "members",
    inputSchema: getMeSchema,
    inputSchemaJSON: toJSONSchema(getMeSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute get me operation
 */
export async function executeGetMe(
    client: TrelloClient,
    _params: GetMeParams
): Promise<OperationResult> {
    try {
        const member = await client.get<TrelloMember>("/members/me", {
            fields: "id,fullName,username,email,avatarUrl,bio,initials,url"
        });

        return {
            success: true,
            data: {
                id: member.id,
                fullName: member.fullName,
                username: member.username,
                email: member.email,
                avatarUrl: member.avatarUrl,
                bio: member.bio,
                initials: member.initials,
                profileUrl: member.url
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get current user",
                retryable: true
            }
        };
    }
}
