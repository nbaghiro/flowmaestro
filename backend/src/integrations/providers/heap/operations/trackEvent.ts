import { z } from "zod";
import { HeapClient } from "../client/HeapClient";
import {
    HeapUserIdentitySchema,
    HeapEventNameSchema,
    HeapEventPropertiesSchema,
    HeapTimestampSchema,
    HeapIdempotencyKeySchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Track Event operation schema
 */
export const trackEventSchema = z.object({
    identity: HeapUserIdentitySchema,
    event: HeapEventNameSchema,
    properties: HeapEventPropertiesSchema,
    timestamp: HeapTimestampSchema,
    idempotency_key: HeapIdempotencyKeySchema
});

export type TrackEventParams = z.infer<typeof trackEventSchema>;

/**
 * Track Event operation definition
 */
export const trackEventOperation: OperationDefinition = {
    id: "trackEvent",
    name: "Track Event",
    description: "Track a custom event in Heap",
    category: "events",
    actionType: "write",
    inputSchema: trackEventSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute track event operation
 */
export async function executeTrackEvent(
    client: HeapClient,
    params: TrackEventParams
): Promise<OperationResult> {
    try {
        // Build the request payload
        const payload: Record<string, unknown> = {
            app_id: client.getAppId(),
            identity: params.identity,
            event: params.event
        };

        // Add optional fields
        if (params.properties) {
            payload.properties = params.properties;
        }

        if (params.timestamp) {
            // Heap expects ISO 8601 timestamp string
            payload.timestamp = new Date(params.timestamp * 1000).toISOString();
        }

        if (params.idempotency_key) {
            payload.idempotency_key = params.idempotency_key;
        }

        await client.post("/api/track", payload);

        return {
            success: true,
            data: {
                tracked: true,
                event: params.event,
                identity: params.identity
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to track event",
                retryable: true
            }
        };
    }
}
