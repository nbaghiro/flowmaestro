import { z } from "zod";
import { RampClient } from "../../client/RampClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { RampUser, RampListResponse } from "../types";

/**
 * List Users operation schema
 */
export const listUsersSchema = z.object({
    start: z.string().optional().describe("Start cursor for pagination"),
    page_size: z.number().min(1).max(100).optional().default(25),
    department_id: z.string().optional(),
    location_id: z.string().optional(),
    status: z.enum(["INVITE_PENDING", "USER_ACTIVE", "USER_SUSPENDED"]).optional()
});

export type ListUsersParams = z.infer<typeof listUsersSchema>;

/**
 * List Users operation definition
 */
export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List all Ramp users with pagination and filters",
    category: "users",
    inputSchema: listUsersSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list users operation
 */
export async function executeListUsers(
    client: RampClient,
    params: ListUsersParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            page_size: String(params.page_size)
        };

        if (params.start) queryParams.start = params.start;
        if (params.department_id) queryParams.department_id = params.department_id;
        if (params.location_id) queryParams.location_id = params.location_id;
        if (params.status) queryParams.status = params.status;

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<RampListResponse<RampUser>>(`/users?${queryString}`);

        return {
            success: true,
            data: {
                users: response.data,
                count: response.data.length,
                next_cursor: response.page?.next
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
