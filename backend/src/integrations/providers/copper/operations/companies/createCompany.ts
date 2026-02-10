import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperCompany } from "../types";

/**
 * Create Company operation schema
 */
export const createCompanySchema = z.object({
    name: z.string().describe("Company name"),
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

export type CreateCompanyParams = z.infer<typeof createCompanySchema>;

/**
 * Create Company operation definition
 */
export const createCompanyOperation: OperationDefinition = {
    id: "createCompany",
    name: "Create Company",
    description: "Create a new company in Copper CRM",
    category: "companies",
    inputSchema: createCompanySchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create company operation
 */
export async function executeCreateCompany(
    client: CopperClient,
    params: CreateCompanyParams
): Promise<OperationResult> {
    try {
        const company = await client.post<CopperCompany>("/companies", params);

        return {
            success: true,
            data: company
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create company",
                retryable: false
            }
        };
    }
}
