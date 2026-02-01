import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";

/**
 * Delete Company Parameters
 */
export const deleteCompanySchema = z.object({
    companyId: z.string()
});

export type DeleteCompanyParams = z.infer<typeof deleteCompanySchema>;

/**
 * Operation Definition
 */
export const deleteCompanyOperation: OperationDefinition = {
    id: "deleteCompany",
    name: "Delete Company",
    description: "Delete a company by ID (archives the company)",
    category: "crm",
    inputSchema: deleteCompanySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Delete Company
 */
export async function executeDeleteCompany(
    client: HubspotClient,
    params: DeleteCompanyParams
): Promise<OperationResult> {
    try {
        await client.delete(`/crm/v3/objects/companies/${params.companyId}`);

        return {
            success: true,
            data: {
                deleted: true,
                companyId: params.companyId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete company",
                retryable: false
            }
        };
    }
}
