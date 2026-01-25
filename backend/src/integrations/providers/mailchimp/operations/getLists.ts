import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { MailchimpListOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MailchimpClient } from "../client/MailchimpClient";

export const getListsSchema = z.object({
    count: z.number().min(1).max(1000).optional().describe("Number of lists to return (max 1000)"),
    offset: z.number().min(0).optional().describe("Number of lists to skip"),
    sortField: z.enum(["date_created"]).optional().describe("Field to sort by"),
    sortDir: z.enum(["ASC", "DESC"]).optional().describe("Sort direction")
});

export type GetListsParams = z.infer<typeof getListsSchema>;

export const getListsOperation: OperationDefinition = {
    id: "getLists",
    name: "Get Lists",
    description: "Get all audiences (lists) from Mailchimp",
    category: "audiences",
    inputSchema: getListsSchema,
    inputSchemaJSON: toJSONSchema(getListsSchema),
    retryable: true,
    timeout: 15000
};

export async function executeGetLists(
    client: MailchimpClient,
    params: GetListsParams
): Promise<OperationResult> {
    try {
        const response = await client.getLists({
            count: params.count,
            offset: params.offset,
            sortField: params.sortField,
            sortDir: params.sortDir
        });

        const lists: MailchimpListOutput[] = response.lists.map((list) => ({
            id: list.id,
            name: list.name,
            memberCount: list.stats.member_count,
            unsubscribeCount: list.stats.unsubscribe_count,
            cleanedCount: list.stats.cleaned_count,
            campaignCount: list.stats.campaign_count,
            dateCreated: list.date_created,
            visibility: list.visibility,
            doubleOptin: list.double_optin
        }));

        return {
            success: true,
            data: {
                lists,
                totalItems: response.total_items,
                hasMore: (params.offset || 0) + lists.length < response.total_items
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get lists",
                retryable: true
            }
        };
    }
}
