import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Get Profiles Parameters
 */
export const getProfilesSchema = z.object({
    filter: z
        .string()
        .optional()
        .describe(
            "Filter query (e.g., 'equals(email,\"test@example.com\")' or 'greater-than(created,2024-01-01T00:00:00Z)')"
        ),
    pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of profiles per page (max 100)"),
    pageCursor: z.string().optional().describe("Cursor for pagination"),
    sort: z
        .string()
        .optional()
        .describe("Sort field (e.g., 'created' or '-created' for descending)")
});

export type GetProfilesParams = z.infer<typeof getProfilesSchema>;

/**
 * Operation Definition
 */
export const getProfilesOperation: OperationDefinition = {
    id: "getProfiles",
    name: "Get Profiles",
    description: "List profiles with optional filters and pagination",
    category: "profiles",
    inputSchema: getProfilesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Get Profiles
 */
export async function executeGetProfiles(
    client: KlaviyoClient,
    params: GetProfilesParams
): Promise<OperationResult> {
    try {
        const response = await client.getProfiles({
            filter: params.filter,
            pageSize: params.pageSize,
            pageCursor: params.pageCursor,
            sort: params.sort
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
                message: error instanceof Error ? error.message : "Failed to get profiles",
                retryable: false
            }
        };
    }
}
