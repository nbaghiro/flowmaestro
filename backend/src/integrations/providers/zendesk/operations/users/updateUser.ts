import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { UserResponse } from "../../types";

/**
 * Update User Parameters
 */
export const updateUserSchema = z.object({
    user_id: z.number().describe("The ID of the user to update"),
    name: z.string().optional().describe("User's full name"),
    email: z.string().email().optional().describe("User's email address"),
    role: z.enum(["end-user", "agent", "admin"]).optional().describe("User role"),
    organization_id: z.number().nullable().optional().describe("Organization ID (null to remove)"),
    external_id: z.string().optional().describe("External ID for the user"),
    alias: z.string().optional().describe("Alias displayed instead of name"),
    details: z.string().optional().describe("Details about the user"),
    notes: z.string().optional().describe("Notes about the user"),
    phone: z.string().optional().describe("User's phone number"),
    time_zone: z.string().optional().describe("User's time zone"),
    locale: z.string().optional().describe("User's locale"),
    tags: z.array(z.string()).optional().describe("Replace all tags on the user"),
    user_fields: z.record(z.unknown()).optional().describe("Custom user field values"),
    suspended: z.boolean().optional().describe("Whether the user is suspended")
});

export type UpdateUserParams = z.infer<typeof updateUserSchema>;

/**
 * Operation Definition
 */
export const updateUserOperation: OperationDefinition = {
    id: "updateUser",
    name: "Update User",
    description: "Update an existing user in Zendesk",
    category: "users",
    inputSchema: updateUserSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update User
 */
export async function executeUpdateUser(
    client: ZendeskClient,
    params: UpdateUserParams
): Promise<OperationResult> {
    try {
        const { user_id, ...updateFields } = params;

        const response = await client.put<UserResponse>(`/users/${user_id}.json`, {
            user: updateFields
        });

        return {
            success: true,
            data: response.user
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update user",
                retryable: false
            }
        };
    }
}
