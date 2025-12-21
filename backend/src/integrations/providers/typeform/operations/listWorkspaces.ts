import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TypeformClient } from "../client/TypeformClient";
import { ListWorkspacesSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TypeformWorkspacesResponse } from "../types";

export const listWorkspacesSchema = ListWorkspacesSchema;

export type ListWorkspacesParams = z.infer<typeof listWorkspacesSchema>;

export const listWorkspacesOperation: OperationDefinition = {
    id: "listWorkspaces",
    name: "List Workspaces",
    description:
        "List all workspaces in the Typeform account. Workspaces are containers for organizing forms.",
    category: "workspaces",
    inputSchema: listWorkspacesSchema,
    inputSchemaJSON: toJSONSchema(listWorkspacesSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListWorkspaces(
    client: TypeformClient,
    params: ListWorkspacesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listWorkspaces({
            page: params.page,
            pageSize: params.pageSize,
            search: params.search
        })) as TypeformWorkspacesResponse;

        return {
            success: true,
            data: {
                totalItems: response.total_items,
                pageCount: response.page_count,
                workspaces: response.items.map((workspace) => ({
                    id: workspace.id,
                    name: workspace.name,
                    isDefault: workspace.default,
                    isShared: workspace.shared,
                    formCount: workspace.forms?.count,
                    formsHref: workspace.forms?.href,
                    selfHref: workspace.self?.href,
                    members: workspace.members?.map((member) => ({
                        email: member.email,
                        name: member.name,
                        role: member.role
                    }))
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list workspaces",
                retryable: true
            }
        };
    }
}
