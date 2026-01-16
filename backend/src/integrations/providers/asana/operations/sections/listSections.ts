import { toJSONSchema } from "../../../../core/schema-utils";
import { listSectionsInputSchema, type ListSectionsInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const listSectionsOperation: OperationDefinition = {
    id: "listSections",
    name: "List Sections",
    description: "List all sections in a project.",
    category: "sections",
    inputSchema: listSectionsInputSchema,
    inputSchemaJSON: toJSONSchema(listSectionsInputSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListSections(
    client: AsanaClient,
    params: ListSectionsInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const sections = await client.getPaginated<Record<string, unknown>>(
            `/projects/${params.project}/sections`,
            queryParams,
            params.limit
        );

        return {
            success: true,
            data: {
                sections,
                count: sections.length,
                project_gid: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list sections",
                retryable: true
            }
        };
    }
}
