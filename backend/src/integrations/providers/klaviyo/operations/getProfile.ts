import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Get Profile Parameters
 */
export const getProfileSchema = z.object({
    profileId: z.string().describe("The ID of the profile to retrieve")
});

export type GetProfileParams = z.infer<typeof getProfileSchema>;

/**
 * Operation Definition
 */
export const getProfileOperation: OperationDefinition = {
    id: "getProfile",
    name: "Get Profile",
    description: "Get a single profile by ID",
    category: "profiles",
    inputSchema: getProfileSchema,
    inputSchemaJSON: toJSONSchema(getProfileSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Profile
 */
export async function executeGetProfile(
    client: KlaviyoClient,
    params: GetProfileParams
): Promise<OperationResult> {
    try {
        const response = await client.getProfile(params.profileId);

        return {
            success: true,
            data: {
                id: response.data.id,
                ...response.data.attributes
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get profile";
        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Profile with ID ${params.profileId} not found`,
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
