import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HootsuiteClient } from "../client/HootsuiteClient";
import { HootsuiteMessageIdSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Delete Message operation schema
 */
export const deleteMessageSchema = z.object({
    messageId: HootsuiteMessageIdSchema
});

export type DeleteMessageParams = z.infer<typeof deleteMessageSchema>;

/**
 * Delete Message operation definition
 */
export const deleteMessageOperation: OperationDefinition = (() => {
    try {
        return {
            id: "deleteMessage",
            name: "Delete Message",
            description: "Delete a scheduled message from Hootsuite",
            category: "messages",
            inputSchema: deleteMessageSchema,
            inputSchemaJSON: toJSONSchema(deleteMessageSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "Hootsuite", err: error },
            "Failed to create deleteMessageOperation"
        );
        throw new Error(
            `Failed to create deleteMessage operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute delete message operation
 */
export async function executeDeleteMessage(
    client: HootsuiteClient,
    params: DeleteMessageParams
): Promise<OperationResult> {
    try {
        await client.deleteMessage(params.messageId);

        return {
            success: true,
            data: {
                deleted: true,
                messageId: params.messageId,
                message: "Message deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete message",
                retryable: true
            }
        };
    }
}
