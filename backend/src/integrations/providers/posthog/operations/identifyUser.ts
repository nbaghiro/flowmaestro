import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { PostHogClient } from "../client/PostHogClient";
import {
    PostHogDistinctIdSchema,
    PostHogPersonPropertiesSchema,
    PostHogPersonSetOnceSchema,
    PostHogTimestampSchema
} from "../schemas";
import type { PostHogCaptureResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Identify User operation schema
 */
export const identifyUserSchema = z.object({
    distinct_id: PostHogDistinctIdSchema,
    properties: PostHogPersonPropertiesSchema.describe("Person properties to set ($set)"),
    properties_set_once: PostHogPersonSetOnceSchema.describe(
        "Person properties to set only if not already set ($set_once)"
    ),
    timestamp: PostHogTimestampSchema
});

export type IdentifyUserParams = z.infer<typeof identifyUserSchema>;

/**
 * Identify User operation definition
 */
export const identifyUserOperation: OperationDefinition = {
    id: "identifyUser",
    name: "Identify User",
    description: "Set person properties in PostHog using the $set event",
    category: "users",
    actionType: "write",
    inputSchema: identifyUserSchema,
    inputSchemaJSON: toJSONSchema(identifyUserSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute identify user operation
 */
export async function executeIdentifyUser(
    client: PostHogClient,
    params: IdentifyUserParams
): Promise<OperationResult> {
    try {
        // Build properties object for $set event
        const properties: Record<string, unknown> = {};

        if (params.properties && Object.keys(params.properties).length > 0) {
            properties.$set = params.properties;
        }

        if (params.properties_set_once && Object.keys(params.properties_set_once).length > 0) {
            properties.$set_once = params.properties_set_once;
        }

        // Build the request payload using $set event
        const payload: Record<string, unknown> = {
            api_key: client.getApiKey(),
            event: "$set",
            distinct_id: params.distinct_id,
            properties
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
                    distinct_id: params.distinct_id,
                    property_count:
                        Object.keys(params.properties || {}).length +
                        Object.keys(params.properties_set_once || {}).length
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "PostHog rejected the identify event",
                    retryable: true
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to identify user",
                retryable: true
            }
        };
    }
}
