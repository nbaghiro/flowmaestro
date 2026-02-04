import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const updateBusinessPartnerSchema = z.object({
    businessPartnerId: z.string().min(1).describe("The business partner ID to update"),
    BusinessPartnerGrouping: z.string().optional().describe("Business partner grouping"),
    FirstName: z.string().optional().describe("First name (for person category)"),
    LastName: z.string().optional().describe("Last name (for person category)"),
    OrganizationBPName1: z.string().optional().describe("Organization name"),
    Language: z.string().optional().describe("Language key (e.g., 'EN')"),
    SearchTerm1: z.string().optional().describe("Search term 1"),
    SearchTerm2: z.string().optional().describe("Search term 2"),
    Industry: z.string().optional().describe("Industry sector key")
});

export type UpdateBusinessPartnerParams = z.infer<typeof updateBusinessPartnerSchema>;

export const updateBusinessPartnerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "updateBusinessPartner",
            name: "Update Business Partner",
            description: "Update an existing business partner in SAP S/4HANA",
            category: "erp",
            actionType: "write",
            inputSchema: updateBusinessPartnerSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create updateBusinessPartnerOperation"
        );
        throw new Error(
            `Failed to create updateBusinessPartner operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeUpdateBusinessPartner(
    client: SapClient,
    params: UpdateBusinessPartnerParams
): Promise<OperationResult> {
    try {
        const { businessPartnerId, ...updateData } = params;
        const response = await client.updateBusinessPartner(businessPartnerId, updateData);

        return {
            success: true,
            data: response.d
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to update business partner",
                retryable: false
            }
        };
    }
}
