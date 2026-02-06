import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Company operation schema
 */
export const deleteCompanySchema = z.object({
    company_id: z.number().describe("The ID of the company to delete")
});

export type DeleteCompanyParams = z.infer<typeof deleteCompanySchema>;

/**
 * Delete Company operation definition
 */
export const deleteCompanyOperation: OperationDefinition = {
    id: "deleteCompany",
    name: "Delete Company",
    description: "Delete a company from Copper CRM",
    category: "companies",
    inputSchema: deleteCompanySchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete company operation
 */
export async function executeDeleteCompany(
    client: CopperClient,
    params: DeleteCompanyParams
): Promise<OperationResult> {
    try {
        await client.delete(`/companies/${params.company_id}`);

        return {
            success: true,
            data: {
                deleted: true,
                company_id: params.company_id
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
