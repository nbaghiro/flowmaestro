import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

/**
 * Subscribe Profile Parameters
 */
export const subscribeProfileSchema = z.object({
    listId: z.string().describe("The ID of the list to subscribe to"),
    email: z.string().email().optional().describe("Email address to subscribe"),
    phone_number: z.string().optional().describe("Phone number to subscribe (E.164 format)"),
    custom_source: z.string().optional().describe("Custom source for the subscription")
});

export type SubscribeProfileParams = z.infer<typeof subscribeProfileSchema>;

/**
 * Operation Definition
 */
export const subscribeProfileOperation: OperationDefinition = {
    id: "subscribeProfile",
    name: "Subscribe Profile",
    description: "Subscribe a profile to email and/or SMS marketing on a specific list",
    category: "profiles",
    actionType: "write",
    inputSchema: subscribeProfileSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Subscribe Profile
 */
export async function executeSubscribeProfile(
    client: KlaviyoClient,
    params: SubscribeProfileParams
): Promise<OperationResult> {
    try {
        if (!params.email && !params.phone_number) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either email or phone_number must be provided",
                    retryable: false
                }
            };
        }

        await client.subscribeProfile(params.listId, {
            email: params.email,
            phone_number: params.phone_number,
            custom_source: params.custom_source
        });

        return {
            success: true,
            data: {
                listId: params.listId,
                email: params.email,
                phone_number: params.phone_number,
                subscribed: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to subscribe profile",
                retryable: false
            }
        };
    }
}
