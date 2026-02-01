import { z } from "zod";
import { HeapClient } from "../client/HeapClient";
import { HeapAccountIdSchema, HeapAccountPropertiesSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Set Account Properties operation schema
 */
export const setAccountPropertiesSchema = z.object({
    account_id: HeapAccountIdSchema,
    properties: HeapAccountPropertiesSchema
});

export type SetAccountPropertiesParams = z.infer<typeof setAccountPropertiesSchema>;

/**
 * Set Account Properties operation definition
 */
export const setAccountPropertiesOperation: OperationDefinition = {
    id: "setAccountProperties",
    name: "Set Account Properties",
    description: "Set properties on an account/organization profile in Heap (B2B analytics)",
    category: "accounts",
    actionType: "write",
    inputSchema: setAccountPropertiesSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute set account properties operation
 */
export async function executeSetAccountProperties(
    client: HeapClient,
    params: SetAccountPropertiesParams
): Promise<OperationResult> {
    try {
        const payload = {
            app_id: client.getAppId(),
            account_id: params.account_id,
            properties: params.properties
        };

        await client.post("/api/add_account_properties", payload);

        return {
            success: true,
            data: {
                updated: true,
                account_id: params.account_id,
                propertyCount: Object.keys(params.properties).length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to set account properties",
                retryable: true
            }
        };
    }
}
