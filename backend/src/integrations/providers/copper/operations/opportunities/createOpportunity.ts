import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperOpportunity } from "../types";

/**
 * Create Opportunity operation schema
 */
export const createOpportunitySchema = z.object({
    name: z.string().describe("Opportunity name"),
    company_id: z.number().optional().describe("Company ID to associate with"),
    primary_contact_id: z.number().optional().describe("Primary contact person ID"),
    pipeline_id: z.number().optional().describe("Pipeline ID"),
    pipeline_stage_id: z.number().optional().describe("Pipeline stage ID"),
    monetary_value: z.number().optional().describe("Monetary value of the opportunity"),
    monetary_unit: z.string().optional().describe("Currency code (e.g., USD)"),
    close_date: z.string().optional().describe("Expected close date (YYYY-MM-DD)"),
    status: z.enum(["Open", "Won", "Lost", "Abandoned"]).optional().describe("Opportunity status"),
    priority: z.enum(["None", "Low", "Medium", "High"]).optional().describe("Priority level"),
    win_probability: z.number().min(0).max(100).optional().describe("Win probability percentage"),
    details: z.string().optional().describe("Additional details/notes"),
    assignee_id: z.number().optional().describe("User ID to assign the opportunity to"),
    customer_source_id: z.number().optional().describe("Customer source ID"),
    loss_reason_id: z.number().optional().describe("Loss reason ID (if status is Lost)"),
    tags: z.array(z.string()).optional().describe("Tags to add to the opportunity")
});

export type CreateOpportunityParams = z.infer<typeof createOpportunitySchema>;

/**
 * Create Opportunity operation definition
 */
export const createOpportunityOperation: OperationDefinition = {
    id: "createOpportunity",
    name: "Create Opportunity",
    description: "Create a new opportunity in Copper CRM",
    category: "opportunities",
    inputSchema: createOpportunitySchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create opportunity operation
 */
export async function executeCreateOpportunity(
    client: CopperClient,
    params: CreateOpportunityParams
): Promise<OperationResult> {
    try {
        const opportunity = await client.post<CopperOpportunity>("/opportunities", params);

        return {
            success: true,
            data: opportunity
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create opportunity",
                retryable: false
            }
        };
    }
}
