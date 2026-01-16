import { toJSONSchema } from "../../../../core/schema-utils";
import { getSectionInputSchema, type GetSectionInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const getSectionOperation: OperationDefinition = {
    id: "getSection",
    name: "Get Section",
    description: "Retrieve a specific section from Asana by its GID.",
    category: "sections",
    inputSchema: getSectionInputSchema,
    inputSchemaJSON: toJSONSchema(getSectionInputSchema),
    retryable: true,
    timeout: 10000
};

export async function executeGetSection(
    client: AsanaClient,
    params: GetSectionInput
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};

        if (params.opt_fields && params.opt_fields.length > 0) {
            queryParams.opt_fields = client.buildOptFields(params.opt_fields);
        }

        const response = await client.getAsana<Record<string, unknown>>(
            `/sections/${params.section_gid}`,
            queryParams
        );

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get section",
                retryable: true
            }
        };
    }
}
