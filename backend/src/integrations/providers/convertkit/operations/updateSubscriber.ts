import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const updateSubscriberSchema = z.object({
    subscriberId: z.string().describe("The subscriber ID to update"),
    firstName: z.string().optional().describe("Updated first name"),
    email: z.string().email().optional().describe("Updated email address"),
    fields: z.record(z.string()).optional().describe("Updated custom field values")
});

export type UpdateSubscriberParams = z.infer<typeof updateSubscriberSchema>;

export const updateSubscriberOperation: OperationDefinition = {
    id: "updateSubscriber",
    name: "Update Subscriber",
    description: "Update an existing subscriber in ConvertKit",
    category: "subscribers",
    inputSchema: updateSubscriberSchema,
    retryable: false,
    timeout: 15000
};

export async function executeUpdateSubscriber(
    client: ConvertKitClient,
    params: UpdateSubscriberParams
): Promise<OperationResult> {
    try {
        const response = await client.updateSubscriber(params.subscriberId, {
            first_name: params.firstName,
            email_address: params.email,
            fields: params.fields
        });

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
        const message = error instanceof Error ? error.message : "Failed to update subscriber";
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
