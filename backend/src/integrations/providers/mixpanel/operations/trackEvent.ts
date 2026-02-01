import { z } from "zod";
import { MixpanelClient } from "../client/MixpanelClient";
import {
    MixpanelDistinctIdSchema,
    MixpanelEventNameSchema,
    MixpanelEventPropertiesSchema,
    MixpanelTimeSchema,
    MixpanelInsertIdSchema
} from "../schemas";
import type { MixpanelTrackResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Track Event operation schema
 */
export const trackEventSchema = z.object({
    event: MixpanelEventNameSchema,
    distinct_id: MixpanelDistinctIdSchema.optional().describe(
        "Unique user identifier (optional for anonymous tracking)"
    ),
    properties: MixpanelEventPropertiesSchema,
    time: MixpanelTimeSchema,
    insert_id: MixpanelInsertIdSchema
});

export type TrackEventParams = z.infer<typeof trackEventSchema>;

/**
 * Track Event operation definition
 */
export const trackEventOperation: OperationDefinition = {
    id: "trackEvent",
    name: "Track Event",
    description: "Track a single event in Mixpanel (for events within the last 5 days)",
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
    client: MixpanelClient,
    params: TrackEventParams
): Promise<OperationResult> {
    try {
        // Build the event payload
        const eventData = {
            event: params.event,
            properties: {
                token: client.getProjectToken(),
                ...(params.distinct_id && { distinct_id: params.distinct_id }),
                ...(params.time && { time: params.time }),
                ...(params.insert_id && { $insert_id: params.insert_id }),
                ...params.properties
            }
        };

        // Encode as base64 JSON for /track endpoint
        const encodedData = Buffer.from(JSON.stringify([eventData])).toString("base64");

        const response = await client.request<MixpanelTrackResponse>({
            method: "POST",
            url: "/track",
            params: { data: encodedData }
        });

        if (response === 1) {
            return {
                success: true,
                data: {
                    tracked: true,
                    event: params.event
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Mixpanel rejected the event",
                    retryable: true
                }
            };
        }
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
