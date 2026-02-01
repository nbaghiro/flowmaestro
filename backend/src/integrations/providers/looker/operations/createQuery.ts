import { z } from "zod";
import { LookerClient } from "../client/LookerClient";
import {
    LookerModelSchema,
    LookerExploreSchema,
    LookerFiltersSchema,
    LookerSortsSchema,
    LookerLimitSchema,
    LookerPivotsSchema,
    LookerDynamicFieldsSchema
} from "./schemas";
import type { LookerQuery } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Create Query operation schema
 */
export const createQuerySchema = z.object({
    model: LookerModelSchema,
    view: LookerExploreSchema,
    fields: z.array(z.string()).min(1).describe("Fields to include in the query"),
    filters: LookerFiltersSchema,
    sorts: LookerSortsSchema,
    limit: LookerLimitSchema,
    pivots: LookerPivotsSchema,
    dynamic_fields: LookerDynamicFieldsSchema
});

export type CreateQueryParams = z.infer<typeof createQuerySchema>;

/**
 * Create Query operation definition
 */
export const createQueryOperation: OperationDefinition = {
    id: "createQuery",
    name: "Create Query",
    description: "Create a new query definition that can be run later",
    category: "queries",
    actionType: "write",
    inputSchema: createQuerySchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute create query operation
 */
export async function executeCreateQuery(
    client: LookerClient,
    params: CreateQueryParams
): Promise<OperationResult> {
    try {
        const queryBody: Record<string, unknown> = {
            model: params.model,
            view: params.view,
            fields: params.fields,
            limit: params.limit.toString()
        };

        if (params.filters) {
            queryBody.filters = params.filters;
        }

        if (params.sorts) {
            queryBody.sorts = params.sorts;
        }

        if (params.pivots) {
            queryBody.pivots = params.pivots;
        }

        if (params.dynamic_fields) {
            queryBody.dynamic_fields = params.dynamic_fields;
        }

        const query = await client.post<LookerQuery>("/queries", queryBody);

        return {
            success: true,
            data: query
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create query",
                retryable: true
            }
        };
    }
}
