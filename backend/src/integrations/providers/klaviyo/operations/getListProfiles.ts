import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Get List Profiles Parameters
 */
export const getListProfilesSchema = z.object({
    listId: z.string().describe("The ID of the list"),
    pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of profiles per page (max 100)"),
    pageCursor: z.string().optional().describe("Cursor for pagination")
});

export type GetListProfilesParams = z.infer<typeof getListProfilesSchema>;

/**
 * Operation Definition
 */
export const getListProfilesOperation: OperationDefinition = {
    id: "getListProfiles",
    name: "Get List Profiles",
    description: "Get all profiles in a specific list",
    category: "lists",
    inputSchema: getListProfilesSchema,
    inputSchemaJSON: toJSONSchema(getListProfilesSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute Get List Profiles
 */
export async function executeGetListProfiles(
    client: KlaviyoClient,
    params: GetListProfilesParams
): Promise<OperationResult> {
    try {
        const response = await client.getListProfiles(params.listId, {
            pageSize: params.pageSize,
            pageCursor: params.pageCursor
        });

        // Extract next cursor from links
        let nextCursor: string | undefined;
        if (response.links?.next) {
            const url = new URL(response.links.next);
            nextCursor = url.searchParams.get("page[cursor]") || undefined;
        }

        return {
            success: true,
            data: {
                listId: params.listId,
                profiles: response.data.map((p) => ({
                    id: p.id,
                    ...p.attributes
                })),
                nextCursor,
                hasMore: !!response.links?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get list profiles",
                retryable: false
            }
        };
    }
}
