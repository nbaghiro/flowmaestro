import { z } from "zod";
import { PostHogClient } from "../client/PostHogClient";
import {
    PostHogDistinctIdSchema,
    PostHogGroupTypeSchema,
    PostHogGroupKeySchema,
    PostHogGroupPropertiesSchema,
    PostHogTimestampSchema
} from "../schemas";
import type { PostHogCaptureResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Identify Group operation schema
 */
export const identifyGroupSchema = z.object({
    distinct_id: PostHogDistinctIdSchema.describe(
        "Distinct ID of the user making the identification (required for audit trail)"
    ),
    group_type: PostHogGroupTypeSchema,
    group_key: PostHogGroupKeySchema,
    properties: PostHogGroupPropertiesSchema.describe("Group properties to set ($group_set)"),
    timestamp: PostHogTimestampSchema
});

export type IdentifyGroupParams = z.infer<typeof identifyGroupSchema>;

/**
 * Identify Group operation definition
 */
export const identifyGroupOperation: OperationDefinition = {
    id: "identifyGroup",
    name: "Identify Group",
    description: "Set group properties in PostHog using the $groupidentify event",
    category: "groups",
    actionType: "write",
    inputSchema: identifyGroupSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute identify group operation
 */
export async function executeIdentifyGroup(
    client: PostHogClient,
    params: IdentifyGroupParams
): Promise<OperationResult> {
    try {
        // Build the request payload using $groupidentify event
        const payload: Record<string, unknown> = {
            api_key: client.getApiKey(),
            event: "$groupidentify",
            distinct_id: params.distinct_id,
            properties: {
                $group_type: params.group_type,
                $group_key: params.group_key,
                $group_set: params.properties
            }
        };

        if (params.timestamp) {
            payload.timestamp = params.timestamp;
        }

        const response = await client.post<PostHogCaptureResponse>("/capture/", payload);

        if (response.status === 1) {
            return {
                success: true,
                data: {
                    identified: true,
                    group_type: params.group_type,
                    group_key: params.group_key,
                    property_count: Object.keys(params.properties || {}).length
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "PostHog rejected the group identify event",
                    retryable: true
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to identify group",
                retryable: true
            }
        };
    }
}
