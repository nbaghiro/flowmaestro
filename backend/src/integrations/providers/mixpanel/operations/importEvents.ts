import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { MixpanelClient } from "../client/MixpanelClient";
import type { MixpanelImportResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Event schema for import (historical events)
 */
const importEventSchema = z.object({
    event: z.string().min(1).describe("The name of the event"),
    distinct_id: z.string().min(1).describe("Unique user identifier (required for import)"),
    time: z.number().describe("Unix timestamp in seconds for when the event occurred"),
    insert_id: z.string().optional().describe("Unique identifier for deduplication"),
    properties: z.record(z.unknown()).optional().describe("Custom properties for the event")
});

/**
 * Import Events (batch) operation schema
 */
export const importEventsSchema = z.object({
    events: z
        .array(importEventSchema)
        .min(1)
        .max(2000)
        .describe("Array of events to import (up to 2000)")
});

export type ImportEventsParams = z.infer<typeof importEventsSchema>;

/**
 * Import Events operation definition
 */
export const importEventsOperation: OperationDefinition = {
    id: "importEvents",
    name: "Import Events (Batch)",
    description: "Import multiple events in batch, including historical data (no 5-day limit)",
    category: "events",
    actionType: "write",
    inputSchema: importEventsSchema,
    inputSchemaJSON: toJSONSchema(importEventsSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute import events operation
 */
export async function executeImportEvents(
    client: MixpanelClient,
    params: ImportEventsParams
): Promise<OperationResult> {
    try {
        // Build events array in Mixpanel import format
        const events = params.events.map((e) => ({
            event: e.event,
            properties: {
                distinct_id: e.distinct_id,
                time: e.time,
                ...(e.insert_id && { $insert_id: e.insert_id }),
                ...e.properties
            }
        }));

        // Import endpoint uses NDJSON format and token as query param
        const ndjson = events.map((e) => JSON.stringify(e)).join("\n");

        const response = await client.requestWithTokenParam<MixpanelImportResponse>({
            method: "POST",
            url: "/import",
            headers: {
                "Content-Type": "application/x-ndjson"
            },
            data: ndjson
        });

        if (response.code === 200) {
            return {
                success: true,
                data: {
                    imported: true,
                    num_records_imported: response.num_records_imported,
                    status: response.status
                }
            };
        } else {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: `Import failed with code ${response.code}: ${response.status}`,
                    retryable: true
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to import events",
                retryable: true
            }
        };
    }
}
