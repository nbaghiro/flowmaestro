import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

export const listPhoneNumbersSchema = z.object({
    friendlyName: z.string().optional().describe("Filter by friendly name"),
    phoneNumber: z.string().optional().describe("Filter by phone number"),
    pageSize: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .default(50)
        .describe("Number of phone numbers per page (max 1000)"),
    pageToken: z.string().optional().describe("Page token for pagination")
});

export type ListPhoneNumbersParams = z.infer<typeof listPhoneNumbersSchema>;

export const listPhoneNumbersOperation: OperationDefinition = {
    id: "listPhoneNumbers",
    name: "List Phone Numbers",
    description: "List phone numbers in your Twilio account with optional filtering",
    category: "phone-numbers",
    inputSchema: listPhoneNumbersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListPhoneNumbers(
    client: TwilioClient,
    params: ListPhoneNumbersParams
): Promise<OperationResult> {
    try {
        const response = await client.listPhoneNumbers({
            friendlyName: params.friendlyName,
            phoneNumber: params.phoneNumber,
            pageSize: params.pageSize,
            pageToken: params.pageToken
        });

        const phoneNumbers = response.incoming_phone_numbers.map((pn) => ({
            sid: pn.sid,
            accountSid: pn.account_sid,
            friendlyName: pn.friendly_name,
            phoneNumber: pn.phone_number,
            capabilities: {
                voice: pn.capabilities.voice,
                sms: pn.capabilities.SMS,
                mms: pn.capabilities.MMS,
                fax: pn.capabilities.fax
            },
            status: pn.status,
            voiceUrl: pn.voice_url,
            smsUrl: pn.sms_url,
            addressRequirements: pn.address_requirements,
            beta: pn.beta,
            dateCreated: pn.date_created
        }));

        // Extract page token from next_page_uri if present
        let nextPageToken: string | null = null;
        if (response.next_page_uri) {
            const urlParams = new URL(`https://api.twilio.com${response.next_page_uri}`)
                .searchParams;
            nextPageToken = urlParams.get("PageToken");
        }

        return {
            success: true,
            data: {
                phoneNumbers,
                hasMore: response.next_page_uri !== null,
                nextPageToken,
                page: response.page,
                pageSize: response.page_size
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list phone numbers",
                retryable: true
            }
        };
    }
}
