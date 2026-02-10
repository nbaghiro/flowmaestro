import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

export const sendSmsSchema = z.object({
    to: z.string().min(1).describe("Destination phone number in E.164 format (e.g., +15551234567)"),
    from: z.string().min(1).describe("Twilio phone number to send from in E.164 format"),
    body: z.string().min(1).max(1600).describe("Message content (max 1600 characters)"),
    statusCallback: z.string().url().optional().describe("Webhook URL for delivery status updates"),
    messagingServiceSid: z
        .string()
        .optional()
        .describe("Messaging Service SID to use instead of from number")
});

export type SendSmsParams = z.infer<typeof sendSmsSchema>;

export const sendSmsOperation: OperationDefinition = {
    id: "sendSms",
    name: "Send SMS",
    description: "Send an SMS message to a phone number",
    category: "messaging",
    inputSchema: sendSmsSchema,
    retryable: false,
    timeout: 30000
};

export async function executeSendSms(
    client: TwilioClient,
    params: SendSmsParams
): Promise<OperationResult> {
    try {
        const message = await client.sendMessage({
            to: params.to,
            from: params.from,
            body: params.body,
            statusCallback: params.statusCallback,
            messagingServiceSid: params.messagingServiceSid
        });

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
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send SMS",
                retryable: false
            }
        };
    }
}
