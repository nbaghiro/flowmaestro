import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoModulesResponse } from "../types";

/**
 * List Modules Parameters
 */
export const listModulesSchema = z.object({});

export type ListModulesParams = z.infer<typeof listModulesSchema>;

/**
 * Operation Definition
 */
export const listModulesOperation: OperationDefinition = {
    id: "listModules",
    name: "List Modules",
    description: "Get list of all available CRM modules and their metadata",
    category: "crm",
    inputSchema: listModulesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Modules
 */
export async function executeListModules(
    client: ZohoCrmClient,
    _params: ListModulesParams
): Promise<OperationResult> {
    try {
        const response = await client.get<ZohoModulesResponse>("/crm/v8/settings/modules");

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list modules",
                retryable: false
            }
        };
    }
}
