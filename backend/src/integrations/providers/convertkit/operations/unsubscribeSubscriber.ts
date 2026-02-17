import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const unsubscribeSubscriberSchema = z.object({
    email: z.string().email().describe("Email address of the subscriber to unsubscribe")
});

export type UnsubscribeSubscriberParams = z.infer<typeof unsubscribeSubscriberSchema>;

export const unsubscribeSubscriberOperation: OperationDefinition = {
    id: "unsubscribeSubscriber",
    name: "Unsubscribe Subscriber",
    description: "Unsubscribe a subscriber from all mailings in ConvertKit",
    category: "subscribers",
    inputSchema: unsubscribeSubscriberSchema,
    retryable: false,
    timeout: 15000
};

export async function executeUnsubscribeSubscriber(
    client: ConvertKitClient,
    params: UnsubscribeSubscriberParams
): Promise<OperationResult> {
    try {
        const response = await client.unsubscribeSubscriber(params.email);

        const output: ConvertKitSubscriberOutput = {
            id: String(response.subscriber.id),
            email: response.subscriber.email_address,
            firstName: response.subscriber.first_name,
            state: response.subscriber.state,
            createdAt: response.subscriber.created_at,
            fields: response.subscriber.fields
        };

        return {
            success: true,
            data: {
                unsubscribed: true,
                subscriber: output
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to unsubscribe";
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
