import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

export const getMessageSchema = z.object({
    messageSid: z.string().min(1).describe("The SID of the message to retrieve")
});

export type GetMessageParams = z.infer<typeof getMessageSchema>;

export const getMessageOperation: OperationDefinition = {
    id: "getMessage",
    name: "Get Message",
    description: "Get details of a specific SMS message by SID",
    category: "messaging",
    inputSchema: getMessageSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetMessage(
    client: TwilioClient,
    params: GetMessageParams
): Promise<OperationResult> {
    try {
        const message = await client.getMessage(params.messageSid);

        return {
            success: true,
            data: {
                sid: message.sid,
                accountSid: message.account_sid,
                from: message.from,
                to: message.to,
                body: message.body,
                status: message.status,
                direction: message.direction,
                numSegments: parseInt(message.num_segments, 10),
                price: message.price,
                priceUnit: message.price_unit,
                errorCode: message.error_code,
                errorMessage: message.error_message,
                dateCreated: message.date_created,
                dateSent: message.date_sent
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get message";

        // Check for not found error
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Message not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
