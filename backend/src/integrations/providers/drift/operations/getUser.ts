import { z } from "zod";
import { DriftClient } from "../client/DriftClient";
import type { DriftUserResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getUserSchema = z.object({
    user_id: z.number().describe("User ID")
});

export type GetUserParams = z.infer<typeof getUserSchema>;

export const getUserOperation: OperationDefinition = {
    id: "getUser",
    name: "Get User",
    description: "Get a specific Drift user by ID",
    category: "users",
    actionType: "read",
    inputSchema: getUserSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetUser(
    client: DriftClient,
    params: GetUserParams
): Promise<OperationResult> {
    try {
        const response = await client.get<DriftUserResponse>(`/users/${params.user_id}`);

        const u = response.data;
        return {
            success: true,
            data: {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                availability: u.availability,
                bot: u.bot,
                avatarUrl: u.avatarUrl,
                phone: u.phone,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt
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
