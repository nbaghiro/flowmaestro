import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Get List Members Parameters
 */
export const getListMembersSchema = z.object({
    listId: z.number().describe("The ID of the static list"),
    fields: z.array(z.string()).optional().describe("List of lead fields to return"),
    nextPageToken: z.string().optional().describe("Token for pagination to get the next page")
});

export type GetListMembersParams = z.infer<typeof getListMembersSchema>;

/**
 * Operation Definition
 */
export const getListMembersOperation: OperationDefinition = {
    id: "getListMembers",
    name: "Get List Members",
    description: "Get all leads in a static list",
    category: "lists",
    inputSchema: getListMembersSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Get List Members
 */
export async function executeGetListMembers(
    client: MarketoClient,
    params: GetListMembersParams
): Promise<OperationResult> {
    try {
        const response = await client.getListMembers(
            params.listId,
            params.fields,
            params.nextPageToken
        );

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to get list members from Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                leads: response.result || [],
                nextPageToken: response.nextPageToken,
                hasMore: !!response.nextPageToken
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get list members",
                retryable: false
            }
        };
    }
}
