import { toJSONSchema } from "../../../../core/schema-utils";
import { ARCHIVE_GROUP } from "../../graphql/mutations";
import { archiveGroupInputSchema, type ArchiveGroupInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const archiveGroupOperation: OperationDefinition = {
    id: "archiveGroup",
    name: "Archive Group",
    description: "Archive a group in Monday.com. Archived groups can be restored later.",
    category: "groups",
    inputSchema: archiveGroupInputSchema,
    inputSchemaJSON: toJSONSchema(archiveGroupInputSchema),
    retryable: true,
    timeout: 10000
};

interface ArchiveGroupResponse {
    archive_group: {
        id: string;
        archived: boolean;
    };
}

export async function executeArchiveGroup(
    client: MondayClient,
    params: ArchiveGroupInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<ArchiveGroupResponse>(ARCHIVE_GROUP, {
            board_id: params.board_id,
            group_id: params.group_id
        });

        return {
            success: true,
            data: {
                archived: response.archive_group.archived,
                group_id: response.archive_group.id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to archive group",
                retryable: true
            }
        };
    }
}
