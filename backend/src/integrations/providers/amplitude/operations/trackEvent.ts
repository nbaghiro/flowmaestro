import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { AmplitudeClient } from "../client/AmplitudeClient";
import {
    AmplitudeUserIdSchema,
    AmplitudeDeviceIdSchema,
    AmplitudeEventTypeSchema,
    AmplitudeEventPropertiesSchema,
    AmplitudeUserPropertiesSchema,
    AmplitudeTimeSchema,
    AmplitudeInsertIdSchema
} from "../schemas";
import type { AmplitudeHttpApiResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Track Event operation schema
 */
export const trackEventSchema = z
    .object({
        user_id: AmplitudeUserIdSchema,
        device_id: AmplitudeDeviceIdSchema,
        event_type: AmplitudeEventTypeSchema,
        event_properties: AmplitudeEventPropertiesSchema,
        user_properties: AmplitudeUserPropertiesSchema,
        time: AmplitudeTimeSchema,
        insert_id: AmplitudeInsertIdSchema
    })
    .refine((data) => data.user_id || data.device_id, {
        message: "Either user_id or device_id is required"
    });

export type TrackEventParams = z.infer<typeof trackEventSchema>;

/**
 * Track Event operation definition
 */
export const trackEventOperation: OperationDefinition = {
    id: "trackEvent",
    name: "Track Event",
    description: "Track a single event in Amplitude",
    category: "events",
    actionType: "write",
    inputSchema: trackEventSchema,
    inputSchemaJSON: toJSONSchema(trackEventSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute track event operation
 */
export async function executeTrackEvent(
    client: AmplitudeClient,
    params: TrackEventParams
): Promise<OperationResult> {
    try {
        // Build the event object
        const event = {
            user_id: params.user_id,
            device_id: params.device_id,
            event_type: params.event_type,
            event_properties: params.event_properties,
            user_properties: params.user_properties,
            time: params.time || Date.now(),
            insert_id: params.insert_id
        };

        // Remove undefined fields
        const cleanEvent = Object.fromEntries(
            Object.entries(event).filter(([, v]) => v !== undefined)
        );

        const response = await client.post<AmplitudeHttpApiResponse>("/2/httpapi", {
            api_key: undefined, // Auth is handled by Basic Auth header
            events: [cleanEvent]
        });

        return {
            success: true,
            data: {
                code: response.code,
                events_ingested: response.events_ingested,
                server_upload_time: response.server_upload_time
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
