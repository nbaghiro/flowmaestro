import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { BufferClient } from "../client/BufferClient";
import { BufferProfileIdSchema } from "../schemas";
import type { BufferProfile } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Profile operation schema
 */
export const getProfileSchema = z.object({
    profileId: BufferProfileIdSchema
});

export type GetProfileParams = z.infer<typeof getProfileSchema>;

/**
 * Get Profile operation definition
 */
export const getProfileOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getProfile",
            name: "Get Profile",
            description: "Get details of a specific Buffer profile",
            category: "profiles",
            inputSchema: getProfileSchema,
            inputSchemaJSON: toJSONSchema(getProfileSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Buffer", err: error }, "Failed to create getProfileOperation");
        throw new Error(
            `Failed to create getProfile operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get profile operation
 */
export async function executeGetProfile(
    client: BufferClient,
    params: GetProfileParams
): Promise<OperationResult> {
    try {
        const profile = (await client.getProfile(params.profileId)) as BufferProfile;

        return {
            success: true,
            data: {
                id: profile.id,
                service: profile.service,
                serviceId: profile.service_id,
                username: profile.service_username,
                formattedUsername: profile.formatted_username,
                avatar: profile.avatar,
                timezone: profile.timezone,
                isDefault: profile.default,
                pendingCount: profile.counts?.pending || 0,
                sentCount: profile.counts?.sent || 0,
                schedules: profile.schedules
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
