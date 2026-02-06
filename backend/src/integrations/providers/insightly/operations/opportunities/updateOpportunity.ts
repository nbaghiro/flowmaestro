import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyOpportunity } from "../types";

/**
 * Update Opportunity operation schema
 */
export const updateOpportunitySchema = z.object({
    OPPORTUNITY_ID: z.number().describe("The ID of the opportunity to update"),
    OPPORTUNITY_NAME: z.string().optional().describe("Opportunity name"),
    OPPORTUNITY_DETAILS: z.string().optional().describe("Opportunity details/notes"),
    PROBABILITY: z.number().min(0).max(100).optional().describe("Win probability percentage"),
    BID_CURRENCY: z.string().optional().describe("Currency code (e.g., USD)"),
    BID_AMOUNT: z.number().optional().describe("Bid amount"),
    BID_TYPE: z.string().optional().describe("Bid type"),
    BID_DURATION: z.number().optional().describe("Bid duration"),
    FORECAST_CLOSE_DATE: z.string().optional().describe("Forecast close date (ISO 8601 format)"),
    ACTUAL_CLOSE_DATE: z.string().optional().describe("Actual close date (ISO 8601 format)"),
    CATEGORY_ID: z.number().optional().describe("Category ID"),
    PIPELINE_ID: z.number().optional().describe("Pipeline ID"),
    STAGE_ID: z.number().optional().describe("Stage ID"),
    OPPORTUNITY_STATE: z
        .enum(["Open", "Abandoned", "Lost", "Suspended", "Won"])
        .optional()
        .describe("Opportunity state"),
    OPPORTUNITY_STATE_REASON_ID: z.number().optional().describe("State reason ID"),
    OWNER_USER_ID: z.number().optional().describe("Owner user ID"),
    RESPONSIBLE_USER_ID: z.number().optional().describe("Responsible user ID"),
    VISIBLE_TO: z.enum(["EVERYONE", "OWNER", "TEAM"]).optional().describe("Visibility setting"),
    VISIBLE_TEAM_ID: z.number().optional().describe("Visible team ID"),
    TAGS: z
        .array(z.object({ TAG_NAME: z.string() }))
        .optional()
        .describe("Tags"),
    LINKS: z
        .array(
            z.object({
                CONTACT_ID: z.number().optional(),
                ORGANISATION_ID: z.number().optional(),
                PROJECT_ID: z.number().optional(),
                ROLE: z.string().optional(),
                DETAILS: z.string().optional()
            })
        )
        .optional()
        .describe("Links to contacts, organisations, or projects")
});

export type UpdateOpportunityParams = z.infer<typeof updateOpportunitySchema>;

/**
 * Update Opportunity operation definition
 */
export const updateOpportunityOperation: OperationDefinition = {
    id: "updateOpportunity",
    name: "Update Opportunity",
    description: "Update an existing opportunity in Insightly CRM",
    category: "opportunities",
    inputSchema: updateOpportunitySchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update opportunity operation
 */
export async function executeUpdateOpportunity(
    client: InsightlyClient,
    params: UpdateOpportunityParams
): Promise<OperationResult> {
    try {
        const opportunity = await client.put<InsightlyOpportunity>("/Opportunities", params);

        return {
            success: true,
            data: opportunity
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update opportunity",
                retryable: false
            }
        };
    }
}
