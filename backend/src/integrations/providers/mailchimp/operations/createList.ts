import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const createListSchema = z.object({
    name: z.string().min(1).describe("The name of the list/audience"),
    company: z.string().min(1).describe("Company or organization name"),
    address1: z.string().min(1).describe("Street address"),
    address2: z.string().optional().describe("Street address line 2"),
    city: z.string().min(1).describe("City"),
    state: z.string().min(1).describe("State or province"),
    zip: z.string().min(1).describe("ZIP or postal code"),
    country: z.string().min(1).describe("Two-letter country code (e.g., US)"),
    phone: z.string().optional().describe("Phone number"),
    permissionReminder: z
        .string()
        .min(1)
        .describe("Permission reminder text explaining why subscribers are receiving emails"),
    fromName: z.string().min(1).describe("Default from name for campaigns"),
    fromEmail: z.string().email().describe("Default from email for campaigns"),
    subject: z.string().min(1).describe("Default email subject"),
    language: z.string().default("en").describe("Default language (e.g., en)"),
    emailTypeOption: z.boolean().optional().describe("Allow subscribers to choose email type"),
    doubleOptin: z.boolean().optional().describe("Require double opt-in")
});

export type CreateListParams = z.infer<typeof createListSchema>;

export const createListOperation: OperationDefinition = {
    id: "createList",
    name: "Create List",
    description: "Create a new audience (list) in Mailchimp",
    category: "audiences",
    inputSchema: createListSchema,
    inputSchemaJSON: toJSONSchema(createListSchema),
    retryable: false,
    timeout: 15000
};

export async function executeCreateList(
    client: MailchimpClient,
    params: CreateListParams
): Promise<OperationResult> {
    try {
        const list = await client.createList({
            name: params.name,
            contact: {
                company: params.company,
                address1: params.address1,
                address2: params.address2,
                city: params.city,
                state: params.state,
                zip: params.zip,
                country: params.country,
                phone: params.phone
            },
            permission_reminder: params.permissionReminder,
            campaign_defaults: {
                from_name: params.fromName,
                from_email: params.fromEmail,
                subject: params.subject,
                language: params.language
            },
            email_type_option: params.emailTypeOption,
            double_optin: params.doubleOptin
        });

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
                message: error instanceof Error ? error.message : "Failed to create list",
                retryable: false
            }
        };
    }
}
