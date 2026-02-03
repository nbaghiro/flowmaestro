import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutUsersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listUsersSchema = z.object({
    page: z.number().optional().default(1).describe("Page number")
});

export type ListUsersParams = z.infer<typeof listUsersSchema>;

export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List Help Scout users in your account",
    category: "users",
    actionType: "read",
    inputSchema: listUsersSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListUsers(
    client: HelpScoutClient,
    params: ListUsersParams
): Promise<OperationResult> {
    try {
        const qs = params.page ? `?page=${params.page}` : "";
        const response = await client.get<HelpScoutUsersResponse>(`/users${qs}`);

        return {
            success: true,
            data: {
                users: response._embedded.users.map((u) => ({
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    role: u.role,
                    timezone: u.timezone,
                    createdAt: u.createdAt,
                    updatedAt: u.updatedAt
                })),
                page: response.page
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
