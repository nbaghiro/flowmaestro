import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyContact } from "../types";

/**
 * Update Contact operation schema
 */
export const updateContactSchema = z.object({
    CONTACT_ID: z.number().describe("The ID of the contact to update"),
    FIRST_NAME: z.string().optional().describe("First name"),
    LAST_NAME: z.string().optional().describe("Last name"),
    SALUTATION: z.string().optional().describe("Salutation (Mr., Mrs., etc.)"),
    BACKGROUND: z.string().optional().describe("Background/notes"),
    DEFAULT_LINKED_ORGANISATION: z.number().optional().describe("Default linked organisation ID"),
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

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

/**
 * Update Contact operation definition
 */
export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update an existing contact in Insightly CRM",
    category: "contacts",
    inputSchema: updateContactSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute update contact operation
 */
export async function executeUpdateContact(
    client: InsightlyClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const contact = await client.put<InsightlyContact>("/Contacts", params);

        return {
            success: true,
            data: contact
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update contact",
                retryable: false
            }
        };
    }
}
