import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

export const sendSmsSchema = z.object({
    from: z.string().describe("Sender phone number (must be your RingCentral number)"),
    to: z.array(z.string()).min(1).max(10).describe("Recipient phone number(s) in E.164 format"),
    text: z.string().min(1).max(1000).describe("SMS message content (max 1000 characters)"),
    countryCode: z.string().optional().describe("ISO country code for recipient (e.g., US)")
});

export type SendSmsParams = z.infer<typeof sendSmsSchema>;

export const sendSmsOperation: OperationDefinition = {
    id: "sendSms",
    name: "Send SMS",
    description: "Send an SMS text message",
    category: "messaging",
    inputSchema: sendSmsSchema,
    retryable: false,
    timeout: 30000
};

export async function executeSendSms(
    client: RingCentralClient,
    params: SendSmsParams
): Promise<OperationResult> {
    try {
        const response = await client.sendSMS({
            from: { phoneNumber: params.from },
            to: params.to.map((phone) => ({ phoneNumber: phone })),
            text: params.text,
            country: params.countryCode ? { isoCode: params.countryCode } : undefined
        });

        return {
            success: true,
            data: {
                messageId: response.id,
                type: response.type,
                direction: response.direction,
                status: response.messageStatus,
                from: response.from.phoneNumber,
                to: response.to.map((r) => r.phoneNumber),
                createdAt: response.creationTime,
                conversationId: response.conversationId
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
