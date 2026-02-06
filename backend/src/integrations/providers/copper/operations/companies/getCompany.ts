import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperCompany } from "../types";

/**
 * Get Company operation schema
 */
export const getCompanySchema = z.object({
    company_id: z.number().describe("The ID of the company to retrieve")
});

export type GetCompanyParams = z.infer<typeof getCompanySchema>;

/**
 * Get Company operation definition
 */
export const getCompanyOperation: OperationDefinition = {
    id: "getCompany",
    name: "Get Company",
    description: "Get a specific company by ID from Copper CRM",
    category: "companies",
    inputSchema: getCompanySchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get company operation
 */
export async function executeGetCompany(
    client: CopperClient,
    params: GetCompanyParams
): Promise<OperationResult> {
    try {
        const company = await client.get<CopperCompany>(`/companies/${params.company_id}`);

        return {
            success: true,
            data: company
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get company",
                retryable: false
            }
        };
    }
}
