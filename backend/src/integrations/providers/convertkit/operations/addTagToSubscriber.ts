import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const addTagToSubscriberSchema = z.object({
    tagId: z.string().describe("The tag ID to add"),
    email: z.string().email().describe("Subscriber email to tag")
});

export type AddTagToSubscriberParams = z.infer<typeof addTagToSubscriberSchema>;

export const addTagToSubscriberOperation: OperationDefinition = {
    id: "addTagToSubscriber",
    name: "Add Tag to Subscriber",
    description: "Add a tag to a subscriber in ConvertKit",
    category: "tags",
    inputSchema: addTagToSubscriberSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddTagToSubscriber(
    client: ConvertKitClient,
    params: AddTagToSubscriberParams
): Promise<OperationResult> {
    try {
        const response = await client.addTagToSubscriber(params.tagId, params.email);

        const subscriber: ConvertKitSubscriberOutput = {
            id: String(response.subscription.subscriber.id),
            email: response.subscription.subscriber.email_address,
            firstName: response.subscription.subscriber.first_name,
            state: response.subscription.subscriber.state,
            createdAt: response.subscription.subscriber.created_at,
            fields: response.subscription.subscriber.fields
        };

        return {
            success: true,
            data: {
                added: true,
                tagId: params.tagId,
                subscriber
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add tag to subscriber";
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
