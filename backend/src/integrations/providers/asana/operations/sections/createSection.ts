import { createSectionInputSchema, type CreateSectionInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { AsanaClient } from "../../client/AsanaClient";

export const createSectionOperation: OperationDefinition = {
    id: "createSection",
    name: "Create Section",
    description: "Create a new section in a project. Sections can be used to organize tasks.",
    category: "sections",
    inputSchema: createSectionInputSchema,
    retryable: true,
    timeout: 10000
};

export async function executeCreateSection(
    client: AsanaClient,
    params: CreateSectionInput
): Promise<OperationResult> {
    try {
        const sectionData: Record<string, unknown> = {
            name: params.name
        };

        if (params.insert_before !== undefined) {
            sectionData.insert_before = params.insert_before;
        }
        if (params.insert_after !== undefined) {
            sectionData.insert_after = params.insert_after;
        }

        const response = await client.postAsana<{
            gid: string;
            name: string;
            resource_type: string;
        }>(`/projects/${params.project}/sections`, sectionData);

        return {
            success: true,
            data: {
                gid: response.gid,
                name: response.name,
                resource_type: response.resource_type,
                project_gid: params.project
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create section",
                retryable: true
            }
        };
    }
}
