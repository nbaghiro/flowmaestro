import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LookerClient } from "../client/LookerClient";
import {
    LookerModelSchema,
    LookerExploreSchema,
    LookerFiltersSchema,
    LookerSortsSchema,
    LookerLimitSchema
} from "./schemas";
import type { LookerQueryResult } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Run Explore operation schema
 */
export const runExploreSchema = z.object({
    model: LookerModelSchema,
    explore: LookerExploreSchema,
    fields: z.array(z.string()).min(1).describe("Fields to include in the query"),
    filters: LookerFiltersSchema,
    sorts: LookerSortsSchema,
    limit: LookerLimitSchema
});

export type RunExploreParams = z.infer<typeof runExploreSchema>;

/**
 * Run Explore operation definition
 */
export const runExploreOperation: OperationDefinition = {
    id: "runExplore",
    name: "Run Explore",
    description: "Run an inline query on an explore and return results",
    category: "explores",
    inputSchema: runExploreSchema,
    inputSchemaJSON: toJSONSchema(runExploreSchema),
    retryable: true,
    timeout: 120000
};

/**
 * Execute run explore operation
 */
export async function executeRunExplore(
    client: LookerClient,
    params: RunExploreParams
): Promise<OperationResult> {
    try {
        // Build inline query body
        const queryBody: Record<string, unknown> = {
            model: params.model,
            view: params.explore,
            fields: params.fields,
            limit: params.limit.toString()
        };

        if (params.filters) {
            queryBody.filters = params.filters;
        }

        if (params.sorts) {
            queryBody.sorts = params.sorts;
        }

        // Run inline query
        const result = await client.post<LookerQueryResult>("/queries/run/json", queryBody);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to run explore",
                retryable: true
            }
        };
    }
}
