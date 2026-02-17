import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const createSubscriberSchema = z.object({
    email: z.string().email().describe("Subscriber email address"),
    firstName: z.string().optional().describe("Subscriber first name"),
    fields: z.record(z.string()).optional().describe("Custom field values"),
    tagIds: z.array(z.number()).optional().describe("Tag IDs to add to subscriber")
});

export type CreateSubscriberParams = z.infer<typeof createSubscriberSchema>;

export const createSubscriberOperation: OperationDefinition = {
    id: "createSubscriber",
    name: "Create Subscriber",
    description: "Create or update a subscriber in ConvertKit (upsert operation)",
    category: "subscribers",
    inputSchema: createSubscriberSchema,
    retryable: false,
    timeout: 15000
};

export async function executeCreateSubscriber(
    client: ConvertKitClient,
    params: CreateSubscriberParams
): Promise<OperationResult> {
    try {
        const response = await client.createSubscriber({
            email: params.email,
            first_name: params.firstName,
            fields: params.fields,
            tags: params.tagIds
        });

        const output: ConvertKitSubscriberOutput = {
            id: String(response.subscription.subscriber.id),
            email: response.subscription.subscriber.email_address,
            firstName: response.subscription.subscriber.first_name,
            state: response.subscription.subscriber.state,
            createdAt: response.subscription.subscriber.created_at,
            fields: response.subscription.subscriber.fields
        };

        return { success: true, data: output };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create subscriber";
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
