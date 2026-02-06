import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperCompany } from "../types";

/**
 * Update Company operation schema
 */
export const updateCompanySchema = z.object({
    company_id: z.number().describe("The ID of the company to update"),
    name: z.string().optional().describe("Company name"),
    email_domain: z.string().optional().describe("Company email domain"),
    phone_numbers: z
        .array(
            z.object({
                number: z.string(),
                category: z.enum(["work", "mobile", "home", "other"]).default("work")
            })
        )
        .optional()
        .describe("Phone numbers"),
    address: z
        .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            postal_code: z.string().optional(),
            country: z.string().optional()
        })
        .optional()
        .describe("Address"),
    details: z.string().optional().describe("Additional details/notes"),
    assignee_id: z.number().optional().describe("User ID to assign the company to"),
    contact_type_id: z.number().optional().describe("Contact type ID"),
    tags: z.array(z.string()).optional().describe("Tags to add to the company"),
    websites: z
        .array(
            z.object({
                url: z.string(),
                category: z.string().default("work")
            })
        )
        .optional()
        .describe("Company websites")
});

export type UpdateCompanyParams = z.infer<typeof updateCompanySchema>;

/**
 * Update Company operation definition
 */
export const updateCompanyOperation: OperationDefinition = {
    id: "updateCompany",
    name: "Update Company",
    description: "Update an existing company in Copper CRM",
    category: "companies",
    inputSchema: updateCompanySchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update company operation
 */
export async function executeUpdateCompany(
    client: CopperClient,
    params: UpdateCompanyParams
): Promise<OperationResult> {
    try {
        const { company_id, ...updateData } = params;
        const company = await client.put<CopperCompany>(`/companies/${company_id}`, updateData);

        return {
            success: true,
            data: company
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update company",
                retryable: false
            }
        };
    }
}
