import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const createBusinessPartnerSchema = z.object({
    BusinessPartnerCategory: z.enum(["1", "2"]).describe("Category: 1 = Person, 2 = Organization"),
    BusinessPartnerGrouping: z.string().optional().describe("Business partner grouping"),
    FirstName: z.string().optional().describe("First name (for person category)"),
    LastName: z.string().optional().describe("Last name (for person category)"),
    OrganizationBPName1: z
        .string()
        .optional()
        .describe("Organization name (for organization category)"),
    Language: z.string().optional().describe("Language key (e.g., 'EN')"),
    SearchTerm1: z.string().optional().describe("Search term 1"),
    SearchTerm2: z.string().optional().describe("Search term 2"),
    Industry: z.string().optional().describe("Industry sector key")
});

export type CreateBusinessPartnerParams = z.infer<typeof createBusinessPartnerSchema>;

export const createBusinessPartnerOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createBusinessPartner",
            name: "Create Business Partner",
            description: "Create a new business partner in SAP S/4HANA",
            category: "erp",
            actionType: "write",
            inputSchema: createBusinessPartnerSchema,
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create createBusinessPartnerOperation"
        );
        throw new Error(
            `Failed to create createBusinessPartner operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeCreateBusinessPartner(
    client: SapClient,
    params: CreateBusinessPartnerParams
): Promise<OperationResult> {
    try {
        const response = await client.createBusinessPartner(params);

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
                    error instanceof Error ? error.message : "Failed to create business partner",
                retryable: false
            }
        };
    }
}
