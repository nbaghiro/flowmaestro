import { z } from "zod";
import type { MailchimpListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getListSchema = z.object({
    listId: z.string().min(1).describe("The unique ID of the list/audience")
});

export type GetListParams = z.infer<typeof getListSchema>;

export const getListOperation: OperationDefinition = {
    id: "getList",
    name: "Get List",
    description: "Get a single audience (list) by ID from Mailchimp",
    category: "audiences",
    inputSchema: getListSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetList(
    client: MailchimpClient,
    params: GetListParams
): Promise<OperationResult> {
    try {
        const list = await client.getList(params.listId);

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
                message: error instanceof Error ? error.message : "Failed to get list",
                retryable: true
            }
        };
    }
}
