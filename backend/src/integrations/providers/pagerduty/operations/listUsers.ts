import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PagerDutyClient } from "../client/PagerDutyClient";

export const listUsersSchema = z.object({
    query: z.string().optional().describe("Search query to filter users by name or email"),
    teamIds: z.array(z.string()).optional().describe("Filter by team IDs"),
    include: z
        .array(z.enum(["contact_methods", "notification_rules", "teams"]))
        .optional()
        .describe("Additional data to include in the response"),
    limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Maximum number of results (1-100)"),
    offset: z.number().min(0).optional().default(0).describe("Offset for pagination")
});

export type ListUsersParams = z.infer<typeof listUsersSchema>;

export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List users in the account with optional filtering",
    category: "users",
    inputSchema: listUsersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListUsers(
    client: PagerDutyClient,
    params: ListUsersParams
): Promise<OperationResult> {
    try {
        const response = await client.listUsers({
            query: params.query,
            team_ids: params.teamIds,
            include: params.include,
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                users: response.data,
                pagination: {
                    offset: response.offset,
                    limit: response.limit,
                    more: response.more,
                    total: response.total
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list users",
                retryable: true
            }
        };
    }
}
