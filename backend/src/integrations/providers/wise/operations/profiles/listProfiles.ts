import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseProfile } from "../types";

/**
 * List Profiles operation schema
 */
export const listProfilesSchema = z.object({});

export type ListProfilesParams = z.infer<typeof listProfilesSchema>;

/**
 * List Profiles operation definition
 */
export const listProfilesOperation: OperationDefinition = {
    id: "listProfiles",
    name: "List Profiles",
    description: "List all profiles (personal and business) associated with the Wise account",
    category: "profiles",
    inputSchema: listProfilesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute list profiles operation
 */
export async function executeListProfiles(
    client: WiseClient,
    _params: ListProfilesParams
): Promise<OperationResult> {
    try {
        const profiles = await client.get<WiseProfile[]>("/v1/profiles");

        return {
            success: true,
            data: {
                profiles,
                count: profiles.length
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
