import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { LinearClient } from "../client/LinearClient";

/**
 * List users input schema (no parameters needed)
 */
export const listUsersSchema = z.object({});

export type ListUsersParams = z.infer<typeof listUsersSchema>;

/**
 * List users operation definition
 */
export const listUsersOperation: OperationDefinition = {
    id: "listUsers",
    name: "List Users",
    description: "List all users in Linear workspace",
    category: "users",
    retryable: true,
    inputSchema: listUsersSchema
};

/**
 * Execute list users operation
 */
export async function executeListUsers(
    client: LinearClient,
    _params: ListUsersParams
): Promise<OperationResult> {
    try {
        const response = await client.listUsers();

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list Linear users",
                retryable: true
            }
        };
    }
}
