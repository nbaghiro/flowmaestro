import { z } from "zod";
import { AmplitudeClient } from "../client/AmplitudeClient";
import type { AmplitudeBatchResponse, AmplitudeEvent } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Event schema for batch tracking
 */
const batchEventSchema = z.object({
    user_id: z.string().optional().describe("The user ID to associate with the event"),
    device_id: z.string().optional().describe("The device ID to associate with the event"),
    event_type: z.string().min(1).describe("The name of the event"),
    event_properties: z.record(z.unknown()).optional().describe("Custom properties for the event"),
    user_properties: z.record(z.unknown()).optional().describe("User properties to set"),
    time: z.number().optional().describe("Unix timestamp in milliseconds"),
    insert_id: z.string().optional().describe("Unique identifier for deduplication")
});

/**
 * Track Events (batch) operation schema
 */
export const trackEventsSchema = z.object({
    events: z
        .array(batchEventSchema)
        .min(1)
        .max(2000)
        .describe("Array of events to track (up to 2000)")
});

export type TrackEventsParams = z.infer<typeof trackEventsSchema>;

/**
 * Track Events operation definition
 */
export const trackEventsOperation: OperationDefinition = {
    id: "trackEvents",
    name: "Track Events (Batch)",
    description: "Track multiple events in a single batch request (up to 2000 events)",
    category: "events",
    actionType: "write",
    inputSchema: trackEventsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute batch track events operation
 */
export async function executeTrackEvents(
    client: AmplitudeClient,
    params: TrackEventsParams
): Promise<OperationResult> {
    try {
        // Validate each event has either user_id or device_id
        const invalidEvents = params.events.filter((e) => !e.user_id && !e.device_id);
        if (invalidEvents.length > 0) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Each event must have either user_id or device_id",
                    retryable: false
                }
            };
        }

        // Build events array with timestamps
        const events: AmplitudeEvent[] = params.events.map((e) => {
            const event: AmplitudeEvent = {
                user_id: e.user_id,
                device_id: e.device_id,
                event_type: e.event_type,
                event_properties: e.event_properties,
                user_properties: e.user_properties,
                time: e.time || Date.now(),
                insert_id: e.insert_id
            };
            // Remove undefined fields
            return Object.fromEntries(
                Object.entries(event).filter(([, v]) => v !== undefined)
            ) as AmplitudeEvent;
        });

        const response = await client.post<AmplitudeBatchResponse>("/batch", {
            events
        });

        return {
            success: true,
            data: {
                code: response.code,
                events_ingested: response.events_ingested,
                server_upload_time: response.server_upload_time,
                payload_size_bytes: response.payload_size_bytes
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to track events",
                retryable: true
            }
        };
    }
}
