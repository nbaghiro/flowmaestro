import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperCompany } from "../types";

/**
 * List Companies operation schema
 */
export const listCompaniesSchema = z.object({
    page_number: z.number().min(1).optional().default(1),
    page_size: z.number().min(1).max(200).optional().default(50),
    sort_by: z.string().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional()
});

export type ListCompaniesParams = z.infer<typeof listCompaniesSchema>;

/**
 * List Companies operation definition
 */
export const listCompaniesOperation: OperationDefinition = {
    id: "listCompanies",
    name: "List Companies",
    description: "List all companies in Copper CRM with pagination",
    category: "companies",
    inputSchema: listCompaniesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list companies operation
 */
export async function executeListCompanies(
    client: CopperClient,
    params: ListCompaniesParams
): Promise<OperationResult> {
    try {
        const requestBody: Record<string, unknown> = {
            page_number: params.page_number,
            page_size: params.page_size
        };

        if (params.sort_by) {
            requestBody.sort_by = params.sort_by;
            requestBody.sort_direction = params.sort_direction || "asc";
        }

        const companies = await client.post<CopperCompany[]>("/companies/search", requestBody);

        return {
            success: true,
            data: {
                companies,
                count: companies.length,
                page: params.page_number,
                page_size: params.page_size
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list companies",
                retryable: true
            }
        };
    }
}
