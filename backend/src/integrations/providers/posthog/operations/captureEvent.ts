import { z } from "zod";
import { PostHogClient } from "../client/PostHogClient";
import {
    PostHogDistinctIdSchema,
    PostHogEventNameSchema,
    PostHogEventPropertiesSchema,
    PostHogTimestampSchema,
    PostHogUuidSchema
} from "../schemas";
import type { PostHogCaptureResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Capture Event operation schema
 */
export const captureEventSchema = z.object({
    event: PostHogEventNameSchema,
    distinct_id: PostHogDistinctIdSchema,
    properties: PostHogEventPropertiesSchema,
    timestamp: PostHogTimestampSchema,
    uuid: PostHogUuidSchema
});

export type CaptureEventParams = z.infer<typeof captureEventSchema>;

/**
 * Capture Event operation definition
 */
export const captureEventOperation: OperationDefinition = {
    id: "captureEvent",
    name: "Capture Event",
    description: "Capture a single event in PostHog",
    category: "events",
    actionType: "write",
    inputSchema: captureEventSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute capture event operation
 */
export async function executeCaptureEvent(
    client: PostHogClient,
    params: CaptureEventParams
): Promise<OperationResult> {
    try {
        // Build the request payload
        const payload: Record<string, unknown> = {
            api_key: client.getApiKey(),
            event: params.event,
            distinct_id: params.distinct_id
        };

        // Add optional fields
        if (params.properties) {
            payload.properties = params.properties;
        }

        if (params.timestamp) {
            payload.timestamp = params.timestamp;
        }

        if (params.uuid) {
            payload.uuid = params.uuid;
        }

        const response = await client.post<PostHogCaptureResponse>("/capture/", payload);

        if (response.status === 1) {
            return {
                success: true,
                data: {
                    captured: true,
                    event: params.event,
                    distinct_id: params.distinct_id
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "PostHog rejected the event",
                    retryable: true
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to capture event",
                retryable: true
            }
        };
    }
}
