import { z } from "zod";
import { SegmentClient } from "../client/SegmentClient";
import {
    SegmentUserIdSchema,
    SegmentAnonymousIdSchema,
    SegmentEventSchema,
    SegmentPropertiesSchema,
    SegmentContextSchema,
    SegmentTimestampSchema,
    SegmentMessageIdSchema,
    SegmentIntegrationsSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Track Event operation schema
 *
 * Track lets you record the actions your users perform.
 * Every action triggers an "event", which can also have associated properties.
 *
 * https://segment.com/docs/connections/spec/track/
 */
export const trackEventSchema = z
    .object({
        userId: SegmentUserIdSchema,
        anonymousId: SegmentAnonymousIdSchema,
        event: SegmentEventSchema,
        properties: SegmentPropertiesSchema,
        context: SegmentContextSchema,
        integrations: SegmentIntegrationsSchema,
        timestamp: SegmentTimestampSchema,
        messageId: SegmentMessageIdSchema
    })
    .refine((data) => data.userId || data.anonymousId, {
        message: "Either userId or anonymousId is required"
    });

export type TrackEventParams = z.infer<typeof trackEventSchema>;

/**
 * Track Event operation definition
 */
export const trackEventOperation: OperationDefinition = {
    id: "trackEvent",
    name: "Track Event",
    description:
        "Record a user action or event. Use this to track when users perform specific actions like 'Order Completed', 'Button Clicked', etc.",
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
    client: SegmentClient,
    params: TrackEventParams
): Promise<OperationResult> {
    try {
        // Build the track payload
        const payload: Record<string, unknown> = {
            event: params.event
        };

        // Add user identifiers
        if (params.userId) {
            payload.userId = params.userId;
        }
        if (params.anonymousId) {
            payload.anonymousId = params.anonymousId;
        }

        // Add optional fields
        if (params.properties) {
            payload.properties = params.properties;
        }
        if (params.context) {
            payload.context = params.context;
        }
        if (params.integrations) {
            payload.integrations = params.integrations;
        }
        if (params.timestamp) {
            payload.timestamp = params.timestamp;
        }
        if (params.messageId) {
            payload.messageId = params.messageId;
        }

        const response = await client.track(payload);

        return {
            success: true,
            data: {
                success: response.success,
                event: params.event,
                userId: params.userId,
                anonymousId: params.anonymousId
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
