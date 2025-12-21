import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TypeformClient } from "../client/TypeformClient";
import { ListFormsSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TypeformFormsResponse } from "../types";

export const listFormsSchema = ListFormsSchema;

export type ListFormsParams = z.infer<typeof listFormsSchema>;

export const listFormsOperation: OperationDefinition = {
    id: "listForms",
    name: "List Forms",
    description:
        "List all typeforms in the account. Returns form metadata including ID, title, creation date, and workspace info.",
    category: "forms",
    inputSchema: listFormsSchema,
    inputSchemaJSON: toJSONSchema(listFormsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListForms(
    client: TypeformClient,
    params: ListFormsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listForms({
            page: params.page,
            pageSize: params.pageSize,
            search: params.search,
            workspaceId: params.workspaceId
        })) as TypeformFormsResponse;

        return {
            success: true,
            data: {
                totalItems: response.total_items,
                pageCount: response.page_count,
                forms: response.items.map((form) => ({
                    id: form.id,
                    title: form.title,
                    lastUpdatedAt: form.last_updated_at,
                    createdAt: form.created_at,
                    workspaceHref: form.workspace?.href,
                    displayLink: form._links?.display
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list forms",
                retryable: true
            }
        };
    }
}
