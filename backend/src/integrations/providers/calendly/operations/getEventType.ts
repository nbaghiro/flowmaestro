import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Event Type operation schema
 */
export const getEventTypeSchema = z.object({
    uuid: z.string().describe("Event type UUID (extracted from the event type URI)")
});

export type GetEventTypeParams = z.infer<typeof getEventTypeSchema>;

/**
 * Get Event Type operation definition
 */
export const getEventTypeOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getEventType",
            name: "Get Event Type",
            description: "Get details of a specific event type",
            category: "data",
            actionType: "read",
            inputSchema: getEventTypeSchema,
            inputSchemaJSON: toJSONSchema(getEventTypeSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create getEventTypeOperation"
        );
        throw new Error(
            `Failed to create getEventType operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get event type operation
 */
export async function executeGetEventType(
    client: CalendlyClient,
    params: GetEventTypeParams
): Promise<OperationResult> {
    try {
        const response = await client.getEventType(params.uuid);
        const eventType = response.resource;

        return {
            success: true,
            data: {
                uri: eventType.uri,
                name: eventType.name,
                active: eventType.active,
                slug: eventType.slug,
                schedulingUrl: eventType.scheduling_url,
                duration: eventType.duration,
                kind: eventType.kind,
                poolingType: eventType.pooling_type,
                type: eventType.type,
                color: eventType.color,
                description: eventType.description_plain,
                descriptionHtml: eventType.description_html,
                internalNote: eventType.internal_note,
                profile: eventType.profile,
                secret: eventType.secret,
                adminManaged: eventType.admin_managed,
                customQuestions: eventType.custom_questions,
                createdAt: eventType.created_at,
                updatedAt: eventType.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get event type",
                retryable: true
            }
        };
    }
}
