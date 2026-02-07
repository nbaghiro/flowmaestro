import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TwilioClient } from "../client/TwilioClient";

export const lookupPhoneNumberSchema = z.object({
    phoneNumber: z
        .string()
        .min(1)
        .describe("Phone number to look up in E.164 format (e.g., +15551234567)"),
    fields: z
        .array(z.enum(["carrier", "caller_name", "line_type_intelligence"]))
        .optional()
        .describe(
            "Data types to include in the lookup (carrier, caller_name, line_type_intelligence)"
        )
});

export type LookupPhoneNumberParams = z.infer<typeof lookupPhoneNumberSchema>;

export const lookupPhoneNumberOperation: OperationDefinition = {
    id: "lookupPhoneNumber",
    name: "Lookup Phone Number",
    description: "Look up carrier, caller name, and line type information for a phone number",
    category: "lookup",
    inputSchema: lookupPhoneNumberSchema,
    retryable: true,
    timeout: 30000
};

export async function executeLookupPhoneNumber(
    client: TwilioClient,
    params: LookupPhoneNumberParams
): Promise<OperationResult> {
    try {
        const result = await client.lookupPhoneNumber(params.phoneNumber, params.fields);

        return {
            success: true,
            data: {
                phoneNumber: result.phone_number,
                nationalFormat: result.national_format,
                countryCode: result.country_code,
                callingCountryCode: result.calling_country_code,
                valid: result.valid,
                validationErrors: result.validation_errors,
                carrier: result.carrier
                    ? {
                          name: result.carrier.name,
                          type: result.carrier.type,
                          mobileCountryCode: result.carrier.mobile_country_code,
                          mobileNetworkCode: result.carrier.mobile_network_code
                      }
                    : null,
                callerName: result.caller_name
                    ? {
                          name: result.caller_name.caller_name,
                          type: result.caller_name.caller_type
                      }
                    : null,
                lineType: result.line_type_intelligence
                    ? {
                          carrierName: result.line_type_intelligence.carrier_name,
                          type: result.line_type_intelligence.type
                      }
                    : null
            }
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Failed to lookup phone number";

        // Check for invalid phone number
        if (errorMessage.includes("invalid") || errorMessage.includes("Invalid")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Invalid phone number format",
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
