import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZendeskClient } from "../../client/ZendeskClient";
import type { UserResponse } from "../../types";

/**
 * Create User Parameters
 */
export const createUserSchema = z.object({
    name: z.string().min(1).describe("User's full name"),
    email: z.string().email().describe("User's email address"),
    role: z
        .enum(["end-user", "agent", "admin"])
        .optional()
        .describe("User role (default: end-user)"),
    organization_id: z.number().optional().describe("Organization ID to associate user with"),
    external_id: z.string().optional().describe("External ID for the user"),
    alias: z.string().optional().describe("Alias displayed instead of name"),
    details: z.string().optional().describe("Details about the user"),
    notes: z.string().optional().describe("Notes about the user (visible to agents only)"),
    phone: z.string().optional().describe("User's phone number"),
    time_zone: z.string().optional().describe("User's time zone (e.g., 'America/New_York')"),
    locale: z.string().optional().describe("User's locale (e.g., 'en-US')"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the user"),
    user_fields: z.record(z.unknown()).optional().describe("Custom user field values"),
    verified: z.boolean().optional().describe("Whether the user's identity has been verified")
});

export type CreateUserParams = z.infer<typeof createUserSchema>;

/**
 * Operation Definition
 */
export const createUserOperation: OperationDefinition = {
    id: "createUser",
    name: "Create User",
    description: "Create a new user in Zendesk",
    category: "users",
    inputSchema: createUserSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create User
 */
export async function executeCreateUser(
    client: ZendeskClient,
    params: CreateUserParams
): Promise<OperationResult> {
    try {
        const response = await client.post<UserResponse>("/users.json", { user: params });

        return {
            success: true,
            data: response.user
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create user",
                retryable: false
            }
        };
    }
}
