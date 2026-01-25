import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Remove Profiles from List Parameters
 */
export const removeProfilesFromListSchema = z.object({
    listId: z.string().describe("The ID of the list"),
    profileIds: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe("Profile IDs to remove from the list (max 100)")
});

export type RemoveProfilesFromListParams = z.infer<typeof removeProfilesFromListSchema>;

/**
 * Operation Definition
 */
export const removeProfilesFromListOperation: OperationDefinition = {
    id: "removeProfilesFromList",
    name: "Remove Profiles from List",
    description: "Remove one or more profiles from a list",
    category: "lists",
    actionType: "write",
    inputSchema: removeProfilesFromListSchema,
    inputSchemaJSON: toJSONSchema(removeProfilesFromListSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Remove Profiles from List
 */
export async function executeRemoveProfilesFromList(
    client: KlaviyoClient,
    params: RemoveProfilesFromListParams
): Promise<OperationResult> {
    try {
        await client.removeProfilesFromList(params.listId, params.profileIds);

        return {
            success: true,
            data: {
                listId: params.listId,
                profileIds: params.profileIds,
                removed: params.profileIds.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to remove profiles from list",
                retryable: false
            }
        };
    }
}
