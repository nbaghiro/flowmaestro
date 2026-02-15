import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaPaginationSchema, OktaSearchSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Users operation schema
 */
export const listUsersSchema = OktaPaginationSchema.merge(OktaSearchSchema);

export type ListUsersParams = z.input<typeof listUsersSchema>;
export type ListUsersParamsParsed = z.output<typeof listUsersSchema>;

/**
 * List Users operation definition
 */
export const listUsersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listUsers",
            name: "List Users",
            description:
                "List all users in the Okta organization with optional search and filtering",
            category: "users",
            inputSchema: listUsersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Okta", err: error }, "Failed to create listUsersOperation");
        throw new Error(
            `Failed to create listUsers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list users operation
 */
export async function executeListUsers(
    client: OktaClient,
    params: ListUsersParams
): Promise<OperationResult> {
    try {
        const parsed = listUsersSchema.parse(params);
        const users = await client.listUsers({
            q: parsed.q,
            filter: parsed.filter,
            limit: parsed.limit,
            after: parsed.after
        });

        const normalizedUsers = users.map((user) => ({
            id: user.id,
            status: user.status,
            login: user.profile.login,
            email: user.profile.email,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            displayName: user.profile.displayName,
            created: user.created,
            lastLogin: user.lastLogin,
            lastUpdated: user.lastUpdated
        }));

        return {
            success: true,
            data: {
                users: normalizedUsers,
                count: normalizedUsers.length
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
