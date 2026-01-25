import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { DatadogEventOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const listEventsSchema = z.object({
    start: z.number().describe("Start timestamp (Unix epoch seconds)"),
    end: z.number().describe("End timestamp (Unix epoch seconds)"),
    tags: z.array(z.string()).optional().describe("Filter by tags"),
    sources: z.array(z.string()).optional().describe("Filter by source"),
    priority: z.enum(["low", "normal"]).optional().describe("Filter by priority")
});

export type ListEventsParams = z.infer<typeof listEventsSchema>;

export const listEventsOperation: OperationDefinition = {
    id: "listEvents",
    name: "List Events",
    description: "Query events from the Datadog event stream",
    category: "events",
    inputSchema: listEventsSchema,
    inputSchemaJSON: toJSONSchema(listEventsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListEvents(
    client: DatadogClient,
    params: ListEventsParams
): Promise<OperationResult> {
    try {
        const result = await client.listEvents({
            start: params.start,
            end: params.end,
            tags: params.tags,
            sources: params.sources,
            priority: params.priority
        });

        const events: DatadogEventOutput[] = (result.events || []).map((e) => ({
            id: e.id!,
            title: e.title,
            text: e.text,
            dateHappened: e.date_happened,
            priority: e.priority || "normal",
            host: e.host,
            tags: e.tags || [],
            alertType: e.alert_type || "info"
        }));

        return {
            success: true,
            data: {
                events,
                count: events.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list events",
                retryable: true
            }
        };
    }
}
