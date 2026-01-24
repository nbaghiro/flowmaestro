import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveLead } from "../types";

interface LeadsListResponse {
    success: boolean;
    data: PipedriveLead[] | null;
    additional_data?: {
        start: number;
        limit: number;
        more_items_in_collection: boolean;
    };
}

/**
 * List Leads Parameters
 */
export const listLeadsSchema = z.object({
    start: z.number().int().min(0).optional().default(0).describe("Pagination start"),
    limit: z.number().int().min(1).max(500).optional().default(50).describe("Items per page"),
    archived_status: z
        .enum(["not_archived", "archived", "all"])
        .optional()
        .default("not_archived")
        .describe("Filter by archived status"),
    owner_id: z.number().int().optional().describe("Filter by owner user ID"),
    sort: z
        .enum(["add_time ASC", "add_time DESC", "update_time ASC", "update_time DESC"])
        .optional()
        .describe("Sort field and direction")
});

export type ListLeadsParams = z.infer<typeof listLeadsSchema>;

/**
 * Operation Definition
 */
export const listLeadsOperation: OperationDefinition = {
    id: "listLeads",
    name: "List Leads",
    description: "Get all leads from the Leads Inbox with optional filtering",
    category: "leads",
    inputSchema: listLeadsSchema,
    inputSchemaJSON: toJSONSchema(listLeadsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute List Leads
 */
export async function executeListLeads(
    client: PipedriveClient,
    params: ListLeadsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            start: params.start,
            limit: params.limit,
            archived_status: params.archived_status
        };

        if (params.owner_id !== undefined) {
            queryParams.owner_id = params.owner_id;
        }
        if (params.sort) {
            queryParams.sort = params.sort;
        }

        const response = await client.get<LeadsListResponse>("/leads", queryParams);

        return {
            success: true,
            data: {
                leads: response.data || [],
                pagination: response.additional_data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list leads",
                retryable: true
            }
        };
    }
}
