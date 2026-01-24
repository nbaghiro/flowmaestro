import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { PostHogClient } from "../client/PostHogClient";
import { PostHogBatchEventSchema } from "../schemas";
import type { PostHogBatchResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Capture Events (Batch) operation schema
 */
export const captureEventsSchema = z.object({
    events: z
        .array(PostHogBatchEventSchema)
        .min(1)
        .max(1000)
        .describe("Array of events to capture (up to 1000)")
});

export type CaptureEventsParams = z.infer<typeof captureEventsSchema>;

/**
 * Capture Events operation definition
 */
export const captureEventsOperation: OperationDefinition = {
    id: "captureEvents",
    name: "Capture Events (Batch)",
    description: "Capture multiple events in a single batch request (up to 1000 events)",
    category: "events",
    actionType: "write",
    inputSchema: captureEventsSchema,
    inputSchemaJSON: toJSONSchema(captureEventsSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute capture events (batch) operation
 */
export async function executeCaptureEvents(
    client: PostHogClient,
    params: CaptureEventsParams
): Promise<OperationResult> {
    try {
        // Build batch events with api_key
        const batch = params.events.map((e) => {
            const event: Record<string, unknown> = {
                event: e.event,
                distinct_id: e.distinct_id
            };

            if (e.properties) {
                event.properties = e.properties;
            }

            if (e.timestamp) {
                event.timestamp = e.timestamp;
            }

            if (e.uuid) {
                event.uuid = e.uuid;
            }

            return event;
        });

        const payload = {
            api_key: client.getApiKey(),
            batch
        };

        const response = await client.post<PostHogBatchResponse>("/batch/", payload);

        if (response.status === 1) {
            return {
                success: true,
                data: {
                    captured: true,
                    event_count: params.events.length
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "PostHog rejected the batch",
                    retryable: true
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to capture events",
                retryable: true
            }
        };
    }
}
