import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const getSubscriberSchema = z.object({
    subscriberId: z.string().describe("The subscriber ID to retrieve")
});

export type GetSubscriberParams = z.infer<typeof getSubscriberSchema>;

export const getSubscriberOperation: OperationDefinition = {
    id: "getSubscriber",
    name: "Get Subscriber",
    description: "Retrieve a single subscriber by ID from ConvertKit",
    category: "subscribers",
    inputSchema: getSubscriberSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetSubscriber(
    client: ConvertKitClient,
    params: GetSubscriberParams
): Promise<OperationResult> {
    try {
        const response = await client.getSubscriber(params.subscriberId);

        const output: ConvertKitSubscriberOutput = {
            id: String(response.subscriber.id),
            email: response.subscriber.email_address,
            firstName: response.subscriber.first_name,
            state: response.subscriber.state,
            createdAt: response.subscriber.created_at,
            fields: response.subscriber.fields
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get subscriber";
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
