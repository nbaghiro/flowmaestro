import { z } from "zod";
import { MixpanelClient } from "../client/MixpanelClient";
import { MixpanelGroupKeySchema, MixpanelGroupIdSchema } from "../schemas";
import type { MixpanelGroupResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Group operations schema
 */
const groupOperationsSchema = z.object({
    $set: z.record(z.unknown()).optional().describe("Set group properties"),
    $set_once: z.record(z.unknown()).optional().describe("Set properties only if not already set"),
    $unset: z.array(z.string()).optional().describe("Remove properties from group")
});

/**
 * Set Group Profile operation schema
 */
export const setGroupProfileSchema = z.object({
    group_key: MixpanelGroupKeySchema,
    group_id: MixpanelGroupIdSchema,
    operations: groupOperationsSchema.describe("Group profile update operations")
});

export type SetGroupProfileParams = z.infer<typeof setGroupProfileSchema>;

/**
 * Set Group Profile operation definition
 */
export const setGroupProfileOperation: OperationDefinition = {
    id: "setGroupProfile",
    name: "Set Group Profile",
    description: "Create or update a group profile in Mixpanel (e.g., company, team)",
    category: "groups",
    actionType: "write",
    inputSchema: setGroupProfileSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute set group profile operation
 */
export async function executeSetGroupProfile(
    client: MixpanelClient,
    params: SetGroupProfileParams
): Promise<OperationResult> {
    try {
        // Build the groups payload
        const payload: Record<string, unknown> = {
            $token: client.getProjectToken(),
            $group_key: params.group_key,
            $group_id: params.group_id
        };

        // Add operations
        if (params.operations.$set) {
            payload.$set = params.operations.$set;
        }
        if (params.operations.$set_once) {
            payload.$set_once = params.operations.$set_once;
        }
        if (params.operations.$unset) {
            payload.$unset = params.operations.$unset;
        }

        // Encode as base64 JSON for /groups endpoint
        const encodedData = Buffer.from(JSON.stringify([payload])).toString("base64");

        const response = await client.request<MixpanelGroupResponse>({
            method: "POST",
            url: "/groups",
            params: { data: encodedData }
        });

        if (response === 1) {
            return {
                success: true,
                data: {
                    updated: true,
                    group_key: params.group_key,
                    group_id: params.group_id
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Mixpanel rejected the group profile update",
                    retryable: true
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update group profile",
                retryable: true
            }
        };
    }
}
