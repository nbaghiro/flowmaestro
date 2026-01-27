import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOutlookClient } from "../client/MicrosoftOutlookClient";

export const listCalendarsSchema = z.object({});

export type ListCalendarsParams = z.infer<typeof listCalendarsSchema>;

export const listCalendarsOperation: OperationDefinition = {
    id: "listCalendars",
    name: "List Calendars",
    description: "List user's calendars",
    category: "calendar",
    inputSchema: listCalendarsSchema,
    inputSchemaJSON: {
        type: "object",
        properties: {}
    },
    retryable: true
};

export async function executeListCalendars(
    client: MicrosoftOutlookClient,
    _params: ListCalendarsParams
): Promise<OperationResult> {
    try {
        const result = await client.listCalendars();
        return {
            success: true,
            data: {
                calendars: result.value.map((cal) => ({
                    id: cal.id,
                    name: cal.name,
                    color: cal.color,
                    isDefaultCalendar: cal.isDefaultCalendar,
                    canEdit: cal.canEdit,
                    owner: cal.owner
                })),
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list calendars",
                retryable: true
            }
        };
    }
}
