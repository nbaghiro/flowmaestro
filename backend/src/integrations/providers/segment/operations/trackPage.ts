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
 * Track Page operation schema
 *
 * The page call lets you record whenever a user sees a page of your website,
 * along with any optional properties about the page.
 *
 * https://segment.com/docs/connections/spec/page/
 */
export const trackPageSchema = z
    .object({
        userId: SegmentUserIdSchema,
        anonymousId: SegmentAnonymousIdSchema,
        name: SegmentNameSchema,
        category: z.string().optional().describe("The category of the page (e.g., 'Docs', 'Blog')"),
        properties: SegmentPropertiesSchema,
        context: SegmentContextSchema,
        integrations: SegmentIntegrationsSchema,
        timestamp: SegmentTimestampSchema,
        messageId: SegmentMessageIdSchema
    })
    .refine((data) => data.userId || data.anonymousId, {
        message: "Either userId or anonymousId is required"
    });

export type TrackPageParams = z.infer<typeof trackPageSchema>;

/**
 * Track Page operation definition
 */
export const trackPageOperation: OperationDefinition = {
    id: "trackPage",
    name: "Track Page",
    description:
        "Record a page view. Use this to track when users view specific pages on your website.",
    category: "events",
    actionType: "write",
    inputSchema: trackPageSchema,
    inputSchemaJSON: toJSONSchema(trackPageSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute track page operation
 */
export async function executeTrackPage(
    client: SegmentClient,
    params: TrackPageParams
): Promise<OperationResult> {
    try {
        // Build the page payload
        const payload: Record<string, unknown> = {};

        // Add user identifiers
        if (params.userId) {
            payload.userId = params.userId;
        }
        if (params.anonymousId) {
            payload.anonymousId = params.anonymousId;
        }

        // Add page-specific fields
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

        const response = await client.page(payload);

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
                message: error instanceof Error ? error.message : "Failed to track page",
                retryable: true
            }
        };
    }
}
