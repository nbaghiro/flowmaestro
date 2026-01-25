import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Add Profiles to List Parameters
 */
export const addProfilesToListSchema = z.object({
    listId: z.string().describe("The ID of the list"),
    profileIds: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe("Profile IDs to add to the list (max 100)")
});

export type AddProfilesToListParams = z.infer<typeof addProfilesToListSchema>;

/**
 * Operation Definition
 */
export const addProfilesToListOperation: OperationDefinition = {
    id: "addProfilesToList",
    name: "Add Profiles to List",
    description: "Add one or more profiles to a list",
    category: "lists",
    actionType: "write",
    inputSchema: addProfilesToListSchema,
    inputSchemaJSON: toJSONSchema(addProfilesToListSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Add Profiles to List
 */
export async function executeAddProfilesToList(
    client: KlaviyoClient,
    params: AddProfilesToListParams
): Promise<OperationResult> {
    try {
        await client.addProfilesToList(params.listId, params.profileIds);

        return {
            success: true,
            data: {
                listId: params.listId,
                profileIds: params.profileIds,
                added: params.profileIds.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add profiles to list",
                retryable: false
            }
        };
    }
}
