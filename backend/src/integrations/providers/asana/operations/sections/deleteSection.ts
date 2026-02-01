import { deleteSectionInputSchema, type DeleteSectionInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const deleteSectionOperation: OperationDefinition = {
    id: "deleteSection",
    name: "Delete Section",
    description: "Delete a section from Asana. Tasks in the section will not be deleted.",
    category: "sections",
    inputSchema: deleteSectionInputSchema,
    retryable: false,
    timeout: 10000
};

export async function executeDeleteSection(
    client: AsanaClient,
    params: DeleteSectionInput
): Promise<OperationResult> {
    try {
        await client.deleteAsana(`/sections/${params.section_gid}`);

        return {
            success: true,
            data: {
                deleted: true,
                section_gid: params.section_gid
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete section",
                retryable: false
            }
        };
    }
}
