import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BufferClient } from "../client/BufferClient";
import type { BufferProfile } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Profiles operation schema
 */
export const listProfilesSchema = z.object({}).describe("No parameters required");

export type ListProfilesParams = z.infer<typeof listProfilesSchema>;

/**
 * List Profiles operation definition
 */
export const listProfilesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listProfiles",
            name: "List Profiles",
            description: "List all connected social media profiles in Buffer",
            category: "profiles",
            inputSchema: listProfilesSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Buffer", err: error }, "Failed to create listProfilesOperation");
        throw new Error(
            `Failed to create listProfiles operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list profiles operation
 */
export async function executeListProfiles(
    client: BufferClient,
    _params: ListProfilesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listProfiles()) as BufferProfile[];

        return {
            success: true,
            data: {
                profiles: response.map((profile) => ({
                    id: profile.id,
                    service: profile.service,
                    serviceId: profile.service_id,
                    username: profile.service_username,
                    formattedUsername: profile.formatted_username,
                    avatar: profile.avatar,
                    timezone: profile.timezone,
                    isDefault: profile.default,
                    pendingCount: profile.counts?.pending || 0,
                    sentCount: profile.counts?.sent || 0
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list profiles",
                retryable: true
            }
        };
    }
}
