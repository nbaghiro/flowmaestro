import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SegmentClient } from "../client/SegmentClient";
import {
    SegmentUserIdSchema,
    SegmentAnonymousIdSchema,
    SegmentNameSchema,
    SegmentPropertiesSchema,
    SegmentContextSchema,
    SegmentTimestampSchema,
    SegmentMessageIdSchema,
    SegmentIntegrationsSchema
} from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Track Screen operation schema
 *
 * The screen call lets you record whenever a user sees a screen of your mobile app,
 * along with any optional properties about the screen.
 *
 * https://segment.com/docs/connections/spec/screen/
 */
export const trackScreenSchema = z
    .object({
        userId: SegmentUserIdSchema,
        anonymousId: SegmentAnonymousIdSchema,
        name: SegmentNameSchema,
        category: z
            .string()
            .optional()
            .describe("The category of the screen (e.g., 'Settings', 'Profile')"),
        properties: SegmentPropertiesSchema,
        context: SegmentContextSchema,
        integrations: SegmentIntegrationsSchema,
        timestamp: SegmentTimestampSchema,
        messageId: SegmentMessageIdSchema
    })
    .refine((data) => data.userId || data.anonymousId, {
        message: "Either userId or anonymousId is required"
    });

export type TrackScreenParams = z.infer<typeof trackScreenSchema>;

/**
 * Track Screen operation definition
 */
export const trackScreenOperation: OperationDefinition = {
    id: "trackScreen",
    name: "Track Screen",
    description:
        "Record a mobile screen view. Use this to track when users view specific screens in your mobile app.",
    category: "events",
    actionType: "write",
    inputSchema: trackScreenSchema,
    inputSchemaJSON: toJSONSchema(trackScreenSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute track screen operation
 */
export async function executeTrackScreen(
    client: SegmentClient,
    params: TrackScreenParams
): Promise<OperationResult> {
    try {
        // Build the screen payload
        const payload: Record<string, unknown> = {};

        // Add user identifiers
        if (params.userId) {
            payload.userId = params.userId;
        }
        if (params.anonymousId) {
            payload.anonymousId = params.anonymousId;
        }

        // Add screen-specific fields
        if (params.name) {
            payload.name = params.name;
        }
        if (params.category) {
            payload.category = params.category;
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

        const response = await client.screen(payload);

        return {
            success: true,
            data: {
                success: response.success,
                name: params.name,
                category: params.category,
                userId: params.userId,
                anonymousId: params.anonymousId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to track screen",
                retryable: true
            }
        };
    }
}
