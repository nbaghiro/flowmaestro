import { ARCHIVE_ITEM } from "../../graphql/mutations";
import { archiveItemInputSchema, type ArchiveItemInput } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { MondayClient } from "../../client/MondayClient";

export const archiveItemOperation: OperationDefinition = {
    id: "archiveItem",
    name: "Archive Item",
    description: "Archive an item in Monday.com. Archived items can be restored later.",
    category: "items",
    inputSchema: archiveItemInputSchema,
    retryable: true,
    timeout: 10000
};

interface ArchiveItemResponse {
    archive_item: {
        id: string;
        state: string;
    };
}

export async function executeArchiveItem(
    client: MondayClient,
    params: ArchiveItemInput
): Promise<OperationResult> {
    try {
        const response = await client.mutation<ArchiveItemResponse>(ARCHIVE_ITEM, {
            item_id: params.item_id
        });

        return {
            success: true,
            data: {
                archived: true,
                item_id: response.archive_item.id,
                state: response.archive_item.state
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to archive item",
                retryable: true
            }
        };
    }
}
