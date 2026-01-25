import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { CalendlyClient } from "../client/CalendlyClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Event Types operation schema
 */
export const listEventTypesSchema = z.object({
    user: z.string().optional().describe("User URI to filter by"),
    organization: z.string().optional().describe("Organization URI to filter by"),
    count: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    pageToken: z.string().optional().describe("Token for pagination"),
    active: z.boolean().optional().describe("Filter by active status")
});

export type ListEventTypesParams = z.infer<typeof listEventTypesSchema>;

/**
 * List Event Types operation definition
 */
export const listEventTypesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listEventTypes",
            name: "List Event Types",
            description: "List scheduling templates (event types) for a user or organization",
            category: "data",
            actionType: "read",
            inputSchema: listEventTypesSchema,
            inputSchemaJSON: toJSONSchema(listEventTypesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Calendly", err: error },
            "Failed to create listEventTypesOperation"
        );
        throw new Error(
            `Failed to create listEventTypes operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list event types operation
 */
export async function executeListEventTypes(
    client: CalendlyClient,
    params: ListEventTypesParams
): Promise<OperationResult> {
    try {
        const response = await client.listEventTypes({
            user: params.user,
            organization: params.organization,
            count: params.count,
            page_token: params.pageToken,
            active: params.active
        });

        return {
            success: true,
            data: {
                eventTypes: response.collection.map((eventType) => ({
                    uri: eventType.uri,
                    name: eventType.name,
                    active: eventType.active,
                    slug: eventType.slug,
                    schedulingUrl: eventType.scheduling_url,
                    duration: eventType.duration,
                    kind: eventType.kind,
                    type: eventType.type,
                    color: eventType.color,
                    description: eventType.description_plain,
                    profile: eventType.profile,
                    createdAt: eventType.created_at,
                    updatedAt: eventType.updated_at
                })),
                pagination: {
                    count: response.pagination.count,
                    nextPageToken: response.pagination.next_page_token
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list event types",
                retryable: true
            }
        };
    }
}
