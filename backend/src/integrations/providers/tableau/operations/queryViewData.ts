import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TableauClient } from "../client/TableauClient";
import { TableauViewIdSchema, TableauMaxAgeSchema } from "./schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Query View Data operation schema
 */
export const queryViewDataSchema = z.object({
    view_id: TableauViewIdSchema,
    max_age: TableauMaxAgeSchema
});

export type QueryViewDataParams = z.infer<typeof queryViewDataSchema>;

/**
 * Query View Data operation definition
 */
export const queryViewDataOperation: OperationDefinition = {
    id: "queryViewData",
    name: "Query View Data",
    description: "Get the underlying data from a view in CSV format",
    category: "views",
    inputSchema: queryViewDataSchema,
    inputSchemaJSON: toJSONSchema(queryViewDataSchema),
    retryable: true,
    timeout: 120000
};

/**
 * Execute query view data operation
 */
export async function executeQueryViewData(
    client: TableauClient,
    params: QueryViewDataParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {};

        if (params.max_age !== undefined) {
            queryParams.maxAge = params.max_age.toString();
        }

        const data = await client.get<string>(
            client.makeSitePath(`/views/${params.view_id}/data`),
            queryParams
        );

        return {
            success: true,
            data: {
                format: "csv",
                content: data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to query view data",
                retryable: true
            }
        };
    }
}
