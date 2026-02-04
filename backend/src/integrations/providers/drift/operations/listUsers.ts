import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftUsersResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listUsersSchema = z.object({});

export type ListUsersParams = z.infer<typeof listUsersSchema>;

export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List Drift users in your organization",
    category: "users",
    actionType: "read",
    inputSchema: listUsersSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListUsers(
    client: DriftClient,
    _params: ListUsersParams
): Promise<OperationResult> {
    try {
        const response = await client.get<DriftUsersResponse>("/users/list");

        return {
            success: true,
            data: {
                users: response.data.map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    availability: u.availability,
                    bot: u.bot,
                    avatarUrl: u.avatarUrl,
                    createdAt: u.createdAt
                }))
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
