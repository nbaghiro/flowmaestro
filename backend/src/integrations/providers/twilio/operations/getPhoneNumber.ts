import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

export const getPhoneNumberSchema = z.object({
    phoneNumberSid: z.string().min(1).describe("The SID of the phone number to retrieve")
});

export type GetPhoneNumberParams = z.infer<typeof getPhoneNumberSchema>;

export const getPhoneNumberOperation: OperationDefinition = {
    id: "getPhoneNumber",
    name: "Get Phone Number",
    description: "Get details of a specific phone number by SID",
    category: "phone-numbers",
    inputSchema: getPhoneNumberSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetPhoneNumber(
    client: TwilioClient,
    params: GetPhoneNumberParams
): Promise<OperationResult> {
    try {
        const pn = await client.getPhoneNumber(params.phoneNumberSid);

        return {
            success: true,
            data: {
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
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get phone number";

        // Check for not found error
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Phone number not found",
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
