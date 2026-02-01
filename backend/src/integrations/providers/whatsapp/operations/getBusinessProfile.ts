import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WhatsAppClient } from "../client/WhatsAppClient";
import type { WhatsAppBusinessProfileResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Business Profile operation schema
 */
export const getBusinessProfileSchema = z.object({
    phoneNumberId: z.string().describe("The WhatsApp Business phone number ID")
});

export type GetBusinessProfileParams = z.infer<typeof getBusinessProfileSchema>;

/**
 * Get Business Profile operation definition
 */
export const getBusinessProfileOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getBusinessProfile",
            name: "Get Business Profile",
            description:
                "Retrieve the business profile information for a WhatsApp Business phone number",
            category: "account",
            inputSchema: getBusinessProfileSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error(
            { component: "WhatsApp", err: error },
            "Failed to create getBusinessProfileOperation"
        );
        throw new Error(
            `Failed to create getBusinessProfile operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get business profile operation
 */
export async function executeGetBusinessProfile(
    client: WhatsAppClient,
    params: GetBusinessProfileParams
): Promise<OperationResult> {
    try {
        const response = await client.getBusinessProfile(params.phoneNumberId);
        const profile = response.data[0];

        if (!profile) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Business profile not found",
                    retryable: false
                }
            };
        }

        const data: WhatsAppBusinessProfileResponse = {
            about: profile.about,
            address: profile.address,
            description: profile.description,
            email: profile.email,
            profilePictureUrl: profile.profile_picture_url,
            vertical: profile.vertical,
            websites: profile.websites
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get business profile",
                retryable: true
            }
        };
    }
}
