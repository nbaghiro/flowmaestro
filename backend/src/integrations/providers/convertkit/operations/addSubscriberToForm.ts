import { z } from "zod";
import type { ConvertKitSubscriberOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const addSubscriberToFormSchema = z.object({
    formId: z.string().describe("The form ID to subscribe to"),
    email: z.string().email().describe("Subscriber email"),
    firstName: z.string().optional().describe("Subscriber first name (optional)")
});

export type AddSubscriberToFormParams = z.infer<typeof addSubscriberToFormSchema>;

export const addSubscriberToFormOperation: OperationDefinition = {
    id: "addSubscriberToForm",
    name: "Add Subscriber to Form",
    description: "Subscribe someone via a form in ConvertKit",
    category: "forms",
    inputSchema: addSubscriberToFormSchema,
    retryable: false,
    timeout: 15000
};

export async function executeAddSubscriberToForm(
    client: ConvertKitClient,
    params: AddSubscriberToFormParams
): Promise<OperationResult> {
    try {
        const response = await client.addSubscriberToForm(
            params.formId,
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
                formId: params.formId,
                subscriber
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to add subscriber to form";
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
