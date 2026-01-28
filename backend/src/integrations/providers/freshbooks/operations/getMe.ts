import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { FreshBooksUserOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FreshBooksHttpClient } from "../client/FreshBooksClient";

export const getMeSchema = z.object({});

export type GetMeParams = z.infer<typeof getMeSchema>;

export const getMeOperation: OperationDefinition = {
    id: "getMe",
    name: "Get Current User",
    description:
        "Get information about the authenticated user including their business memberships",
    category: "user",
    inputSchema: getMeSchema,
    inputSchemaJSON: toJSONSchema(getMeSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetMe(
    client: FreshBooksHttpClient,
    _params: GetMeParams
): Promise<OperationResult> {
    try {
        const response = await client.getMe();
        const user = response.response;

        const formattedUser: FreshBooksUserOutput = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            confirmedAt: user.confirmed_at,
            createdAt: user.created_at,
            setupComplete: user.setup_complete,
            businesses: user.business_memberships?.map((membership) => ({
                id: membership.business.id,
                accountId: membership.business.account_id,
                name: membership.business.name,
                role: membership.role
            }))
        };

        return {
            success: true,
            data: formattedUser
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user details",
                retryable: true
            }
        };
    }
}
