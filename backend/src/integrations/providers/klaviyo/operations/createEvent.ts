import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Create Event Parameters
 */
export const createEventSchema = z.object({
    metricName: z
        .string()
        .describe("Name of the event/metric (e.g., 'Placed Order', 'Viewed Product')"),
    email: z.string().email().optional().describe("Email of the profile"),
    phone_number: z.string().optional().describe("Phone number of the profile (E.164 format)"),
    profileId: z.string().optional().describe("Klaviyo profile ID"),
    properties: z.record(z.unknown()).optional().describe("Event properties (e.g., order details)"),
    time: z.string().optional().describe("ISO 8601 timestamp (defaults to now)"),
    value: z.number().optional().describe("Monetary value of the event"),
    unique_id: z.string().optional().describe("Unique identifier to prevent duplicate events")
});

export type CreateEventParams = z.infer<typeof createEventSchema>;

/**
 * Operation Definition
 */
export const createEventOperation: OperationDefinition = {
    id: "createEvent",
    name: "Create Event",
    description: "Track a custom event for a profile (e.g., purchase, page view)",
    category: "events",
    actionType: "write",
    inputSchema: createEventSchema,
    inputSchemaJSON: toJSONSchema(createEventSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Create Event
 */
export async function executeCreateEvent(
    client: KlaviyoClient,
    params: CreateEventParams
): Promise<OperationResult> {
    try {
        if (!params.email && !params.phone_number && !params.profileId) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "At least one of email, phone_number, or profileId must be provided",
                    retryable: false
                }
            };
        }

        await client.createEvent({
            metric: {
                name: params.metricName
            },
            profile: {
                email: params.email,
                phone_number: params.phone_number,
                id: params.profileId
            },
            properties: params.properties,
            time: params.time,
            value: params.value,
            unique_id: params.unique_id
        });

        return {
            success: true,
            data: {
                metricName: params.metricName,
                profile: {
                    email: params.email,
                    phone_number: params.phone_number,
                    profileId: params.profileId
                },
                tracked: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create event",
                retryable: false
            }
        };
    }
}
