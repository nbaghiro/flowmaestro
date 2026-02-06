import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyOrganisation } from "../types";

/**
 * Update Organisation operation schema
 */
export const updateOrganisationSchema = z.object({
    ORGANISATION_ID: z.number().describe("The ID of the organisation to update"),
    ORGANISATION_NAME: z.string().optional().describe("Organisation name"),
    BACKGROUND: z.string().optional().describe("Background/notes"),
    OWNER_USER_ID: z.number().optional().describe("Owner user ID"),
    VISIBLE_TO: z.enum(["EVERYONE", "OWNER", "TEAM"]).optional().describe("Visibility setting"),
    VISIBLE_TEAM_ID: z.number().optional().describe("Visible team ID"),
    CONTACTINFOS: z
        .array(
            z.object({
                TYPE: z.enum(["EMAIL", "PHONE", "WEBSITE", "SOCIAL"]).optional(),
                SUBTYPE: z.string().optional(),
                LABEL: z.string().optional(),
                DETAIL: z.string()
            })
        )
        .optional()
        .describe("Contact information (emails, phones, etc.)"),
    ADDRESSES: z
        .array(
            z.object({
                ADDRESS_TYPE: z.enum(["WORK", "HOME", "POSTAL", "OTHER"]).optional(),
                STREET: z.string().optional(),
                CITY: z.string().optional(),
                STATE: z.string().optional(),
                POSTCODE: z.string().optional(),
                COUNTRY: z.string().optional()
            })
        )
        .optional()
        .describe("Addresses"),
    TAGS: z
        .array(z.object({ TAG_NAME: z.string() }))
        .optional()
        .describe("Tags"),
    SOCIAL_LINKEDIN: z.string().optional().describe("LinkedIn profile URL"),
    SOCIAL_FACEBOOK: z.string().optional().describe("Facebook profile URL"),
    SOCIAL_TWITTER: z.string().optional().describe("Twitter handle")
});

export type UpdateOrganisationParams = z.infer<typeof updateOrganisationSchema>;

/**
 * Update Organisation operation definition
 */
export const updateOrganisationOperation: OperationDefinition = {
    id: "updateOrganisation",
    name: "Update Organisation",
    description: "Update an existing organisation in Insightly CRM",
    category: "organisations",
    inputSchema: updateOrganisationSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update organisation operation
 */
export async function executeUpdateOrganisation(
    client: InsightlyClient,
    params: UpdateOrganisationParams
): Promise<OperationResult> {
    try {
        const organisation = await client.put<InsightlyOrganisation>("/Organisations", params);

        return {
            success: true,
            data: organisation
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update organisation",
                retryable: false
            }
        };
    }
}
