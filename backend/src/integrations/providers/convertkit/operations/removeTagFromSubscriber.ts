import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const removeTagFromSubscriberSchema = z.object({
    tagId: z.string().describe("The tag ID to remove"),
    subscriberId: z.string().describe("The subscriber ID to untag")
});

export type RemoveTagFromSubscriberParams = z.infer<typeof removeTagFromSubscriberSchema>;

export const removeTagFromSubscriberOperation: OperationDefinition = {
    id: "removeTagFromSubscriber",
    name: "Remove Tag from Subscriber",
    description: "Remove a tag from a subscriber in ConvertKit",
    category: "tags",
    inputSchema: removeTagFromSubscriberSchema,
    retryable: false,
    timeout: 15000
};

export async function executeRemoveTagFromSubscriber(
    client: ConvertKitClient,
    params: RemoveTagFromSubscriberParams
): Promise<OperationResult> {
    try {
        await client.removeTagFromSubscriber(params.tagId, params.subscriberId);

        return {
            success: true,
            data: {
                removed: true,
                tagId: params.tagId,
                subscriberId: params.subscriberId
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to remove tag from subscriber";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: false
            }
        };
    }
}
