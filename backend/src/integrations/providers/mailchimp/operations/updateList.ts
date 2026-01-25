import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const updateListSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience"),
    name: z.string().optional().describe("The name of the list/audience"),
    company: z.string().optional().describe("Company or organization name"),
    address1: z.string().optional().describe("Street address"),
    address2: z.string().optional().describe("Street address line 2"),
    city: z.string().optional().describe("City"),
    state: z.string().optional().describe("State or province"),
    zip: z.string().optional().describe("ZIP or postal code"),
    country: z.string().optional().describe("Two-letter country code"),
    phone: z.string().optional().describe("Phone number"),
    permissionReminder: z.string().optional().describe("Permission reminder text"),
    fromName: z.string().optional().describe("Default from name for campaigns"),
    fromEmail: z.string().email().optional().describe("Default from email for campaigns"),
    subject: z.string().optional().describe("Default email subject"),
    language: z.string().optional().describe("Default language"),
    emailTypeOption: z.boolean().optional().describe("Allow subscribers to choose email type"),
    doubleOptin: z.boolean().optional().describe("Require double opt-in")
});

export type UpdateListParams = z.infer<typeof updateListSchema>;

export const updateListOperation: OperationDefinition = {
    id: "updateList",
    name: "Update List",
    description: "Update an existing audience (list) in Mailchimp",
    category: "audiences",
    inputSchema: updateListSchema,
    inputSchemaJSON: toJSONSchema(updateListSchema),
    retryable: false,
    timeout: 15000
};

export async function executeUpdateList(
    client: MailchimpClient,
    params: UpdateListParams
): Promise<OperationResult> {
    try {
        const updateData: Parameters<typeof client.updateList>[1] = {};

        if (params.name) updateData.name = params.name;
        if (params.permissionReminder) updateData.permission_reminder = params.permissionReminder;
        if (params.emailTypeOption !== undefined)
            updateData.email_type_option = params.emailTypeOption;
        if (params.doubleOptin !== undefined) updateData.double_optin = params.doubleOptin;

        // Build contact if any contact fields provided
        if (
            params.company ||
            params.address1 ||
            params.address2 ||
            params.city ||
            params.state ||
            params.zip ||
            params.country ||
            params.phone
        ) {
            updateData.contact = {
                company: params.company,
                address1: params.address1,
                address2: params.address2,
                city: params.city,
                state: params.state,
                zip: params.zip,
                country: params.country,
                phone: params.phone
            };
        }

        // Build campaign_defaults if any provided
        if (params.fromName || params.fromEmail || params.subject || params.language) {
            updateData.campaign_defaults = {
                from_name: params.fromName,
                from_email: params.fromEmail,
                subject: params.subject,
                language: params.language
            };
        }

        const list = await client.updateList(params.listId, updateData);

        const output: MailchimpListOutput = {
            id: list.id,
            name: list.name,
            memberCount: list.stats.member_count,
            unsubscribeCount: list.stats.unsubscribe_count,
            cleanedCount: list.stats.cleaned_count,
            campaignCount: list.stats.campaign_count,
            dateCreated: list.date_created,
            visibility: list.visibility,
            doubleOptin: list.double_optin
        };

        return {
            success: true,
            data: output
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update list",
                retryable: false
            }
        };
    }
}
