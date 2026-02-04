import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const getBusinessPartnerSchema = z.object({
    businessPartnerId: z.string().min(1).describe("The business partner ID (e.g., '0010000001')")
});

export type GetBusinessPartnerParams = z.infer<typeof getBusinessPartnerSchema>;

export const getBusinessPartnerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getBusinessPartner",
            name: "Get Business Partner",
            description: "Get a business partner by ID from SAP S/4HANA",
            category: "erp",
            actionType: "read",
            inputSchema: getBusinessPartnerSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create getBusinessPartnerOperation"
        );
        throw new Error(
            `Failed to create getBusinessPartner operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeGetBusinessPartner(
    client: SapClient,
    params: GetBusinessPartnerParams
): Promise<OperationResult> {
    try {
        const response = await client.getBusinessPartner(params.businessPartnerId);

        return {
            success: true,
            data: response.d
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get business partner",
                retryable: false
            }
        };
    }
}
