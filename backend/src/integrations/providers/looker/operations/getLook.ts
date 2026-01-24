import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LookerClient } from "../client/LookerClient";
import { LookerLookIdSchema } from "./schemas";
import type { LookerLook } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Look operation schema
 */
export const getLookSchema = z.object({
    look_id: LookerLookIdSchema
});

export type GetLookParams = z.infer<typeof getLookSchema>;

/**
 * Get Look operation definition
 */
export const getLookOperation: OperationDefinition = {
    id: "getLook",
    name: "Get Look",
    description: "Get a specific Look by ID with all details",
    category: "looks",
    inputSchema: getLookSchema,
    inputSchemaJSON: toJSONSchema(getLookSchema),
    retryable: true,
    timeout: 30000
};

/**
 * Execute get look operation
 */
export async function executeGetLook(
    client: LookerClient,
    params: GetLookParams
): Promise<OperationResult> {
    try {
        const look = await client.get<LookerLook>(`/looks/${params.look_id}`);

        return {
            success: true,
            data: look
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get look",
                retryable: true
            }
        };
    }
}
