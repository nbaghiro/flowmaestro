import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TableauClient } from "../client/TableauClient";
import { TableauDataSourceIdSchema } from "./schemas";
import type { TableauDataSource } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Data Source operation schema
 */
export const getDataSourceSchema = z.object({
    datasource_id: TableauDataSourceIdSchema
});

export type GetDataSourceParams = z.infer<typeof getDataSourceSchema>;

/**
 * Get Data Source operation definition
 */
export const getDataSourceOperation: OperationDefinition = {
    id: "getDataSource",
    name: "Get Data Source",
    description: "Get data source details by ID",
    category: "datasources",
    inputSchema: getDataSourceSchema,
    inputSchemaJSON: toJSONSchema(getDataSourceSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute get data source operation
 */
export async function executeGetDataSource(
    client: TableauClient,
    params: GetDataSourceParams
): Promise<OperationResult> {
    try {
        const response = await client.get<{ datasource: TableauDataSource }>(
            client.makeSitePath(`/datasources/${params.datasource_id}`)
        );

        return {
            success: true,
            data: response.datasource
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get data source",
                retryable: true
            }
        };
    }
}
