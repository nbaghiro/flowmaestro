import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import type { LinkedInUserProfile } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Profile operation schema (no parameters needed)
 */
export const getProfileSchema = z.object({});

export type GetProfileParams = z.infer<typeof getProfileSchema>;

/**
 * Get Profile operation definition
 */
export const getProfileOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getProfile",
            name: "Get Profile",
            description:
                "Get the authenticated user's LinkedIn profile. Returns the user's person URN needed for creating posts.",
            category: "profile",
            inputSchema: getProfileSchema,
            inputSchemaJSON: toJSONSchema(getProfileSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        console.error("[LinkedIn] Failed to create getProfileOperation:", error);
        throw new Error(
            `Failed to create getProfile operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get profile operation
 */
export async function executeGetProfile(
    client: LinkedInClient,
    _params: GetProfileParams
): Promise<OperationResult> {
    try {
        const profile = (await client.getProfile()) as LinkedInUserProfile;

        return {
            success: true,
            data: {
                personUrn: `urn:li:person:${profile.sub}`,
                userId: profile.sub,
                name: profile.name,
                firstName: profile.given_name,
                lastName: profile.family_name,
                email: profile.email,
                emailVerified: profile.email_verified,
                picture: profile.picture,
                locale: profile.locale
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get profile",
                retryable: true
            }
        };
    }
}
