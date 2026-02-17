import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const addSubscriberToSequenceSchema = z.object({
    sequenceId: z.string().describe("The sequence ID to add subscriber to"),
    email: z.string().email().describe("Subscriber email to add"),
    firstName: z.string().optional().describe("Subscriber first name (optional)")
});

export type AddSubscriberToSequenceParams = z.infer<typeof addSubscriberToSequenceSchema>;

export const addSubscriberToSequenceOperation: OperationDefinition = {
    id: "addSubscriberToSequence",
    name: "Add Subscriber to Sequence",
    description: "Add a subscriber to a sequence (email course) in ConvertKit",
    category: "sequences",
    inputSchema: addSubscriberToSequenceSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddSubscriberToSequence(
    client: ConvertKitClient,
    params: AddSubscriberToSequenceParams
): Promise<OperationResult> {
    try {
        const response = await client.addSubscriberToSequence(
            params.sequenceId,
            params.email,
            params.firstName
        );

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
                sequenceId: params.sequenceId,
                subscriber
            }
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to add subscriber to sequence";
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
