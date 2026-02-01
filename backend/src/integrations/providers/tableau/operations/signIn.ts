import { z } from "zod";
import { TableauClient } from "../client/TableauClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Sign In operation schema (no parameters needed - uses stored credentials)
 */
export const signInSchema = z.object({});

export type SignInParams = z.infer<typeof signInSchema>;

/**
 * Sign In operation definition
 */
export const signInOperation: OperationDefinition = {
    id: "signIn",
    name: "Sign In",
    description: "Authenticate with Tableau Server and get credentials token",
    category: "auth",
    actionType: "write",
    inputSchema: signInSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute sign in operation
 */
export async function executeSignIn(
    client: TableauClient,
    _params: SignInParams
): Promise<OperationResult> {
    try {
        const credentials = await client.signIn();

        return {
            success: true,
            data: {
                site_id: credentials.site.id,
                site_content_url: credentials.site.contentUrl,
                user_id: credentials.user.id,
                user_name: credentials.user.name,
                authenticated: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to sign in",
                retryable: true
            }
        };
    }
}
