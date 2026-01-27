import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SegmentClient } from "../client/SegmentClient";
import {
    SegmentUserIdSchema,
    SegmentAnonymousIdSchema,
    SegmentEventSchema,
    SegmentPropertiesSchema,
    SegmentTraitsSchema,
    SegmentGroupIdSchema,
    SegmentPreviousIdSchema,
    SegmentContextSchema,
    SegmentTimestampSchema,
    SegmentMessageIdSchema,
    SegmentIntegrationsSchema,
    SegmentNameSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Base batch event schema
 */
const baseBatchEventSchema = z.object({
    userId: SegmentUserIdSchema,
    anonymousId: SegmentAnonymousIdSchema,
    context: SegmentContextSchema,
    integrations: SegmentIntegrationsSchema,
    timestamp: SegmentTimestampSchema,
    messageId: SegmentMessageIdSchema
});

/**
 * Track event in batch
 */
const batchTrackEventSchema = baseBatchEventSchema.extend({
    type: z.literal("track"),
    event: SegmentEventSchema,
    properties: SegmentPropertiesSchema
});

/**
 * Identify event in batch
 */
const batchIdentifyEventSchema = baseBatchEventSchema.extend({
    type: z.literal("identify"),
    traits: SegmentTraitsSchema
});

/**
 * Page event in batch
 */
const batchPageEventSchema = baseBatchEventSchema.extend({
    type: z.literal("page"),
    name: SegmentNameSchema,
    category: z.string().optional(),
    properties: SegmentPropertiesSchema
});

/**
 * Screen event in batch
 */
const batchScreenEventSchema = baseBatchEventSchema.extend({
    type: z.literal("screen"),
    name: SegmentNameSchema,
    category: z.string().optional(),
    properties: SegmentPropertiesSchema
});

/**
 * Group event in batch
 */
const batchGroupEventSchema = baseBatchEventSchema.extend({
    type: z.literal("group"),
    groupId: SegmentGroupIdSchema,
    traits: SegmentTraitsSchema
});

/**
 * Alias event in batch
 */
const batchAliasEventSchema = baseBatchEventSchema.extend({
    type: z.literal("alias"),
    previousId: SegmentPreviousIdSchema
});

/**
 * Union of all batch event types
 */
const batchEventSchema = z.discriminatedUnion("type", [
    batchTrackEventSchema,
    batchIdentifyEventSchema,
    batchPageEventSchema,
    batchScreenEventSchema,
    batchGroupEventSchema,
    batchAliasEventSchema
]);

/**
 * Batch Events operation schema
 *
 * The batch method lets you send a series of identify, group, track, page, and screen
 * requests in a single batch. This is the most efficient way to send data to Segment.
 *
 * Constraints:
 * - Max 500KB per request
 * - Max 32KB per individual event
 * - Max 2500 events per batch
 *
 * https://segment.com/docs/connections/sources/catalog/libraries/server/http-api/#batch
 */
export const batchEventsSchema = z.object({
    batch: z
        .array(batchEventSchema)
        .min(1)
        .max(2500)
        .describe("Array of events to send. Each event must have a 'type' field."),
    context: SegmentContextSchema,
    integrations: SegmentIntegrationsSchema
});

export type BatchEventsParams = z.infer<typeof batchEventsSchema>;

/**
 * Batch Events operation definition
 */
export const batchEventsOperation: OperationDefinition = {
    id: "batchEvents",
    name: "Batch Events",
    description:
        "Send multiple events in a single request. More efficient for high-volume tracking. Max 2500 events, 500KB per request.",
    category: "events",
    actionType: "write",
    inputSchema: batchEventsSchema,
    inputSchemaJSON: toJSONSchema(batchEventsSchema),
    retryable: true,
    timeout: 30000 // Longer timeout for batch operations
};

/**
 * Execute batch events operation
 */
export async function executeBatchEvents(
    client: SegmentClient,
    params: BatchEventsParams
): Promise<OperationResult> {
    try {
        // Validate batch constraints
        const batchSize = params.batch.length;
        if (batchSize > 2500) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `Batch size ${batchSize} exceeds maximum of 2500 events`,
                    retryable: false
                }
            };
        }

        // Build the batch payload
        const payload: Record<string, unknown> = {
            batch: params.batch.map((event) => {
                // Clean up undefined fields from each event
                const cleanEvent: Record<string, unknown> = { type: event.type };

                if (event.userId) cleanEvent.userId = event.userId;
                if (event.anonymousId) cleanEvent.anonymousId = event.anonymousId;
                if (event.context) cleanEvent.context = event.context;
                if (event.integrations) cleanEvent.integrations = event.integrations;
                if (event.timestamp) cleanEvent.timestamp = event.timestamp;
                if (event.messageId) cleanEvent.messageId = event.messageId;

                // Add type-specific fields
                switch (event.type) {
                    case "track":
                        cleanEvent.event = event.event;
                        if (event.properties) cleanEvent.properties = event.properties;
                        break;
                    case "identify":
                        if (event.traits) cleanEvent.traits = event.traits;
                        break;
                    case "page":
                    case "screen":
                        if (event.name) cleanEvent.name = event.name;
                        if (event.category) cleanEvent.category = event.category;
                        if (event.properties) cleanEvent.properties = event.properties;
                        break;
                    case "group":
                        cleanEvent.groupId = event.groupId;
                        if (event.traits) cleanEvent.traits = event.traits;
                        break;
                    case "alias":
                        cleanEvent.previousId = event.previousId;
                        break;
                }

                return cleanEvent;
            })
        };

        // Add optional top-level fields
        if (params.context) {
            payload.context = params.context;
        }
        if (params.integrations) {
            payload.integrations = params.integrations;
        }

        const response = await client.batch(payload);

        // Count events by type
        const eventCounts: Record<string, number> = {};
        for (const event of params.batch) {
            eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
        }

        return {
            success: true,
            data: {
                success: response.success,
                eventsCount: batchSize,
                eventsByType: eventCounts
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send batch events",
                retryable: true
            }
        };
    }
}
