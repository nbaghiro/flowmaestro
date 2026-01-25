import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HootsuiteClient } from "../client/HootsuiteClient";
import type { HootsuiteSocialProfile } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Social Profiles operation schema
 */
export const listSocialProfilesSchema = z.object({}).describe("No parameters required");

export type ListSocialProfilesParams = z.infer<typeof listSocialProfilesSchema>;

/**
 * List Social Profiles operation definition
 */
export const listSocialProfilesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listSocialProfiles",
            name: "List Social Profiles",
            description: "List all connected social media profiles in Hootsuite",
            category: "profiles",
            inputSchema: listSocialProfilesSchema,
            inputSchemaJSON: toJSONSchema(listSocialProfilesSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Hootsuite", err: error },
            "Failed to create listSocialProfilesOperation"
        );
        throw new Error(
            `Failed to create listSocialProfiles operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list social profiles operation
 */
export async function executeListSocialProfiles(
    client: HootsuiteClient,
    _params: ListSocialProfilesParams
): Promise<OperationResult> {
    try {
        const profiles = (await client.listSocialProfiles()) as HootsuiteSocialProfile[];

        return {
            success: true,
            data: {
                profiles: profiles.map((profile) => ({
                    id: profile.id,
                    type: profile.type,
                    socialNetworkId: profile.socialNetworkId,
                    username: profile.socialNetworkUsername,
                    avatarUrl: profile.avatarUrl,
                    ownerId: profile.ownerId || profile.owner?.id
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list social profiles",
                retryable: true
            }
        };
    }
}
