import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { WhatsAppPhoneNumberResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Phone Numbers operation schema
 */
export const getPhoneNumbersSchema = z.object({
    wabaId: z.string().describe("The WhatsApp Business Account ID")
});

export type GetPhoneNumbersParams = z.infer<typeof getPhoneNumbersSchema>;

/**
 * Get Phone Numbers operation definition
 */
export const getPhoneNumbersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPhoneNumbers",
            name: "Get Phone Numbers",
            description: "List all phone numbers associated with a WhatsApp Business Account",
            category: "account",
            inputSchema: getPhoneNumbersSchema,
            inputSchemaJSON: toJSONSchema(getPhoneNumbersSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "WhatsApp", err: error },
            "Failed to create getPhoneNumbersOperation"
        );
        throw new Error(
            `Failed to create getPhoneNumbers operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get phone numbers operation
 */
export async function executeGetPhoneNumbers(
    client: WhatsAppClient,
    params: GetPhoneNumbersParams
): Promise<OperationResult> {
    try {
        const response = await client.getPhoneNumbers(params.wabaId);

        const phoneNumbers: WhatsAppPhoneNumberResponse[] = response.data.map((phone) => ({
            id: phone.id,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            qualityRating: phone.quality_rating,
            codeVerificationStatus: phone.code_verification_status,
            platformType: phone.platform_type,
            throughputLevel: phone.throughput?.level
        }));

        return {
            success: true,
            data: {
                phoneNumbers,
                hasMore: !!response.paging?.cursors?.after
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get phone numbers",
                retryable: true
            }
        };
    }
}
