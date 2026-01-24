import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { HeapClient } from "../client/HeapClient";
import { HeapUserIdentitySchema, HeapUserPropertiesSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Set User Properties operation schema
 */
export const setUserPropertiesSchema = z.object({
    identity: HeapUserIdentitySchema,
    properties: HeapUserPropertiesSchema
});

export type SetUserPropertiesParams = z.infer<typeof setUserPropertiesSchema>;

/**
 * Set User Properties operation definition
 */
export const setUserPropertiesOperation: OperationDefinition = {
    id: "setUserProperties",
    name: "Set User Properties",
    description: "Set properties on a user profile in Heap",
    category: "users",
    actionType: "write",
    inputSchema: setUserPropertiesSchema,
    inputSchemaJSON: toJSONSchema(setUserPropertiesSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute set user properties operation
 */
export async function executeSetUserProperties(
    client: HeapClient,
    params: SetUserPropertiesParams
): Promise<OperationResult> {
    try {
        const payload = {
            app_id: client.getAppId(),
            identity: params.identity,
            properties: params.properties
        };

        await client.post("/api/add_user_properties", payload);

        return {
            success: true,
            data: {
                updated: true,
                identity: params.identity,
                propertyCount: Object.keys(params.properties).length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to set user properties",
                retryable: true
            }
        };
    }
}
