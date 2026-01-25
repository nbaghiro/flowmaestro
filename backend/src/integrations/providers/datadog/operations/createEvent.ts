import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { DatadogClient } from "../client/DatadogClient";

export const createEventSchema = z.object({
    title: z.string().min(1).describe("Event title"),
    text: z.string().min(1).describe("Event body (supports markdown)"),
    tags: z.array(z.string()).optional().describe("Tags for the event"),
    alertType: z
        .enum(["info", "warning", "error", "success"])
        .optional()
        .describe("Alert type for the event"),
    priority: z.enum(["low", "normal"]).optional().describe("Event priority"),
    host: z.string().optional().describe("Hostname to associate with the event")
});

export type CreateEventParams = z.infer<typeof createEventSchema>;

export const createEventOperation: OperationDefinition = {
    id: "createEvent",
    name: "Create Event",
    description: "Post a new event to the Datadog event stream",
    category: "events",
    inputSchema: createEventSchema,
    inputSchemaJSON: toJSONSchema(createEventSchema),
    retryable: false,
    timeout: 30000
};

export async function executeCreateEvent(
    client: DatadogClient,
    params: CreateEventParams
): Promise<OperationResult> {
    try {
        const result = await client.createEvent({
            title: params.title,
            text: params.text,
            tags: params.tags,
            alert_type: params.alertType,
            priority: params.priority,
            host: params.host
        });

        return {
            success: true,
            data: {
                id: result.event.id,
                title: result.event.title,
                status: result.status
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
