import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { RingCentralClient } from "../client/RingCentralClient";

const attachmentSchema = z.object({
    fileName: z.string().describe("File name with extension"),
    contentType: z.string().describe("MIME type (e.g., image/jpeg, image/png)"),
    content: z.string().describe("Base64-encoded file content")
});

export const sendMmsSchema = z.object({
    from: z.string().describe("Sender phone number (must be your RingCentral number)"),
    to: z.array(z.string()).min(1).max(10).describe("Recipient phone number(s) in E.164 format"),
    text: z.string().optional().describe("Optional text message"),
    attachments: z
        .array(attachmentSchema)
        .min(1)
        .max(10)
        .describe("Media attachments (images, etc.)"),
    countryCode: z.string().optional().describe("ISO country code for recipient")
});

export type SendMmsParams = z.infer<typeof sendMmsSchema>;

export const sendMmsOperation: OperationDefinition = {
    id: "sendMms",
    name: "Send MMS",
    description: "Send an MMS message with attachments",
    category: "messaging",
    inputSchema: sendMmsSchema,
    retryable: false,
    timeout: 60000
};

export async function executeSendMms(
    client: RingCentralClient,
    params: SendMmsParams
): Promise<OperationResult> {
    try {
        const response = await client.sendMMS({
            from: { phoneNumber: params.from },
            to: params.to.map((phone) => ({ phoneNumber: phone })),
            text: params.text || "",
            attachments: params.attachments,
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
                attachmentCount: response.attachments?.length || 0
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send MMS",
                retryable: false
            }
        };
    }
}
