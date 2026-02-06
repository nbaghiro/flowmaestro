import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperLead } from "../types";

/**
 * Create Lead operation schema
 */
export const createLeadSchema = z.object({
    name: z.string().describe("Full name of the lead"),
    prefix: z.string().optional().describe("Name prefix (Mr., Mrs., etc.)"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    email: z
        .object({
            email: z.string().email(),
            category: z.enum(["work", "personal", "other"]).default("work")
        })
        .optional()
        .describe("Email address"),
    company_name: z.string().optional().describe("Company name"),
    title: z.string().optional().describe("Job title"),
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
    assignee_id: z.number().optional().describe("User ID to assign the lead to"),
    status_id: z.number().optional().describe("Lead status ID"),
    monetary_value: z.number().optional().describe("Monetary value of the lead"),
    monetary_unit: z.string().optional().describe("Currency code (e.g., USD)"),
    tags: z.array(z.string()).optional().describe("Tags to add to the lead")
});

export type CreateLeadParams = z.infer<typeof createLeadSchema>;

/**
 * Create Lead operation definition
 */
export const createLeadOperation: OperationDefinition = {
    id: "createLead",
    name: "Create Lead",
    description: "Create a new lead in Copper CRM",
    category: "leads",
    inputSchema: createLeadSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create lead operation
 */
export async function executeCreateLead(
    client: CopperClient,
    params: CreateLeadParams
): Promise<OperationResult> {
    try {
        const lead = await client.post<CopperLead>("/leads", params);

        return {
            success: true,
            data: lead
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create lead",
                retryable: false
            }
        };
    }
}
