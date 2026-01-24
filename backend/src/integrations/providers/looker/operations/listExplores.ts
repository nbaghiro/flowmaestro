import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LookerClient } from "../client/LookerClient";
import type { LookerModel } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Explores operation schema
 */
export const listExploresSchema = z.object({});

export type ListExploresParams = z.infer<typeof listExploresSchema>;

/**
 * List Explores operation definition
 */
export const listExploresOperation: OperationDefinition = {
    id: "listExplores",
    name: "List Explores",
    description: "Get all available explores across all models",
    category: "explores",
    inputSchema: listExploresSchema,
    inputSchemaJSON: toJSONSchema(listExploresSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute list explores operation
 */
export async function executeListExplores(
    client: LookerClient,
    _params: ListExploresParams
): Promise<OperationResult> {
    try {
        // Get all lookml models which contain explores
        const models = await client.get<LookerModel[]>("/lookml_models");

        // Flatten explores from all models
        const explores = models.flatMap((model) =>
            (model.explores || []).map((explore) => ({
                ...explore,
                model_name: model.name
            }))
        );

        return {
            success: true,
            data: {
                explores,
                count: explores.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list explores",
                retryable: true
            }
        };
    }
}
