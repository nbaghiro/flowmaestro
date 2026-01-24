import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { MixpanelClient } from "../client/MixpanelClient";
import { MixpanelDistinctIdSchema } from "../schemas";
import type { MixpanelEngageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Profile operations schema
 */
const profileOperationsSchema = z.object({
    $set: z.record(z.unknown()).optional().describe("Set profile properties"),
    $set_once: z.record(z.unknown()).optional().describe("Set properties only if not already set"),
    $add: z.record(z.number()).optional().describe("Increment numeric properties"),
    $append: z.record(z.unknown()).optional().describe("Append to list properties"),
    $union: z.record(z.array(z.unknown())).optional().describe("Union values with list properties"),
    $remove: z.record(z.unknown()).optional().describe("Remove values from list properties"),
    $unset: z.array(z.string()).optional().describe("Remove properties from profile")
});

/**
 * Set User Profile operation schema
 */
export const setUserProfileSchema = z.object({
    distinct_id: MixpanelDistinctIdSchema,
    operations: profileOperationsSchema.describe("Profile update operations"),
    ip: z.string().optional().describe("IP address for geo-location"),
    ignore_time: z.boolean().optional().describe("Skip updating $last_seen")
});

export type SetUserProfileParams = z.infer<typeof setUserProfileSchema>;

/**
 * Set User Profile operation definition
 */
export const setUserProfileOperation: OperationDefinition = {
    id: "setUserProfile",
    name: "Set User Profile",
    description: "Create or update a user profile in Mixpanel People",
    category: "profiles",
    actionType: "write",
    inputSchema: setUserProfileSchema,
    inputSchemaJSON: toJSONSchema(setUserProfileSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute set user profile operation
 */
export async function executeSetUserProfile(
    client: MixpanelClient,
    params: SetUserProfileParams
): Promise<OperationResult> {
    try {
        // Build the engage payload
        const payload: Record<string, unknown> = {
            $token: client.getProjectToken(),
            $distinct_id: params.distinct_id
        };

        // Add optional fields
        if (params.ip) {
            payload.$ip = params.ip;
        }
        if (params.ignore_time) {
            payload.$ignore_time = params.ignore_time;
        }

        // Add operations
        if (params.operations.$set) {
            payload.$set = params.operations.$set;
        }
        if (params.operations.$set_once) {
            payload.$set_once = params.operations.$set_once;
        }
        if (params.operations.$add) {
            payload.$add = params.operations.$add;
        }
        if (params.operations.$append) {
            payload.$append = params.operations.$append;
        }
        if (params.operations.$union) {
            payload.$union = params.operations.$union;
        }
        if (params.operations.$remove) {
            payload.$remove = params.operations.$remove;
        }
        if (params.operations.$unset) {
            payload.$unset = params.operations.$unset;
        }

        // Encode as base64 JSON for /engage endpoint
        const encodedData = Buffer.from(JSON.stringify([payload])).toString("base64");

        const response = await client.request<MixpanelEngageResponse>({
            method: "POST",
            url: "/engage",
            params: { data: encodedData }
        });

        if (response === 1) {
            return {
                success: true,
                data: {
                    updated: true,
                    distinct_id: params.distinct_id
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Mixpanel rejected the profile update",
                    retryable: true
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update user profile",
                retryable: true
            }
        };
    }
}
