import { toJSONSchema } from "../../../../core/schema-utils";
import { ARCHIVE_BOARD } from "../../graphql/mutations";
import { archiveBoardInputSchema, type ArchiveBoardInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const archiveBoardOperation: OperationDefinition = {
    id: "archiveBoard",
    name: "Archive Board",
    description: "Archive a board in Monday.com. Archived boards can be restored later.",
    category: "boards",
    inputSchema: archiveBoardInputSchema,
    inputSchemaJSON: toJSONSchema(archiveBoardInputSchema),
    retryable: true,
    timeout: 10000
};

interface ArchiveBoardResponse {
    archive_board: {
        id: string;
        state: string;
    };
}

export async function executeArchiveBoard(
    client: MondayClient,
    params: ArchiveBoardInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<ArchiveBoardResponse>(ARCHIVE_BOARD, {
            board_id: params.board_id
        });

        return {
            success: true,
            data: {
                archived: true,
                board_id: response.archive_board.id,
                state: response.archive_board.state
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to archive board",
                retryable: true
            }
        };
    }
}
