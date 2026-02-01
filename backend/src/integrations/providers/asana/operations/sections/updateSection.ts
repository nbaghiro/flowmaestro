import { updateSectionInputSchema, type UpdateSectionInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const updateSectionOperation: OperationDefinition = {
    id: "updateSection",
    name: "Update Section",
    description: "Update an existing section in Asana (e.g., rename it).",
    category: "sections",
    inputSchema: updateSectionInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeUpdateSection(
    client: AsanaClient,
    params: UpdateSectionInput
): Promise<OperationResult> {
    try {
        const { section_gid, ...updateData } = params;

        const sectionData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (value !== undefined) {
                sectionData[key] = value;
            }
        }

        const response = await client.putAsana<{
            gid: string;
            name: string;
            resource_type: string;
        }>(`/sections/${section_gid}`, sectionData);

        return {
            success: true,
            data: {
                gid: response.gid,
                name: response.name,
                resource_type: response.resource_type
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update section",
                retryable: true
            }
        };
    }
}
