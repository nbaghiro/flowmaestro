import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseProfile } from "../types";

/**
 * Get Profile operation schema
 */
export const getProfileSchema = z.object({
    id: z.number().describe("Profile ID")
});

export type GetProfileParams = z.infer<typeof getProfileSchema>;

/**
 * Get Profile operation definition
 */
export const getProfileOperation: OperationDefinition = {
    id: "getProfile",
    name: "Get Profile",
    description: "Get a specific profile by ID from Wise",
    category: "profiles",
    inputSchema: getProfileSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get profile operation
 */
export async function executeGetProfile(
    client: WiseClient,
    params: GetProfileParams
): Promise<OperationResult> {
    try {
        const profile = await client.get<WiseProfile>(`/v1/profiles/${params.id}`);

        return {
            success: true,
            data: profile
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get profile";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Profile not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
