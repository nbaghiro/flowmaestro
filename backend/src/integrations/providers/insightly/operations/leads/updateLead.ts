import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyLead } from "../types";

/**
 * Update Lead operation schema
 */
export const updateLeadSchema = z.object({
    LEAD_ID: z.number().describe("The ID of the lead to update"),
    FIRST_NAME: z.string().optional().describe("First name"),
    LAST_NAME: z.string().optional().describe("Last name"),
    SALUTATION: z.string().optional().describe("Salutation (Mr., Mrs., etc.)"),
    TITLE: z.string().optional().describe("Job title"),
    EMAIL: z.string().email().optional().describe("Email address"),
    PHONE: z.string().optional().describe("Phone number"),
    MOBILE: z.string().optional().describe("Mobile number"),
    FAX: z.string().optional().describe("Fax number"),
    WEBSITE: z.string().optional().describe("Website URL"),
    ORGANISATION_NAME: z.string().optional().describe("Organisation name"),
    INDUSTRY: z.string().optional().describe("Industry"),
    EMPLOYEE_COUNT: z.number().optional().describe("Employee count"),
    LEAD_DESCRIPTION: z.string().optional().describe("Lead description/notes"),
    LEAD_SOURCE_ID: z.number().optional().describe("Lead source ID"),
    LEAD_STATUS_ID: z.number().optional().describe("Lead status ID"),
    LEAD_RATING: z.number().optional().describe("Lead rating"),
    OWNER_USER_ID: z.number().optional().describe("Owner user ID"),
    RESPONSIBLE_USER_ID: z.number().optional().describe("Responsible user ID"),
    VISIBLE_TO: z.enum(["EVERYONE", "OWNER", "TEAM"]).optional().describe("Visibility setting"),
    VISIBLE_TEAM_ID: z.number().optional().describe("Visible team ID"),
    ADDRESS_STREET: z.string().optional().describe("Street address"),
    ADDRESS_CITY: z.string().optional().describe("City"),
    ADDRESS_STATE: z.string().optional().describe("State/Province"),
    ADDRESS_POSTCODE: z.string().optional().describe("Postal code"),
    ADDRESS_COUNTRY: z.string().optional().describe("Country"),
    TAGS: z
        .array(z.object({ TAG_NAME: z.string() }))
        .optional()
        .describe("Tags")
});

export type UpdateLeadParams = z.infer<typeof updateLeadSchema>;

/**
 * Update Lead operation definition
 */
export const updateLeadOperation: OperationDefinition = {
    id: "updateLead",
    name: "Update Lead",
    description: "Update an existing lead in Insightly CRM",
    category: "leads",
    inputSchema: updateLeadSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update lead operation
 */
export async function executeUpdateLead(
    client: InsightlyClient,
    params: UpdateLeadParams
): Promise<OperationResult> {
    try {
        const lead = await client.put<InsightlyLead>("/Leads", params);

        return {
            success: true,
            data: lead
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update lead",
                retryable: false
            }
        };
    }
}
