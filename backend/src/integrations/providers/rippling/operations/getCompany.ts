import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Company operation schema
 */
export const getCompanySchema = z.object({});

export type GetCompanyParams = z.infer<typeof getCompanySchema>;

/**
 * Get Company operation definition
 */
export const getCompanyOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCompany",
            name: "Get Company",
            description: "Get current company information from Rippling",
            category: "hr",
            actionType: "read",
            inputSchema: getCompanySchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Rippling", err: error }, "Failed to create getCompanyOperation");
        throw new Error(
            `Failed to create getCompany operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get company operation
 */
export async function executeGetCompany(
    client: RipplingClient,
    _params: GetCompanyParams
): Promise<OperationResult> {
    try {
        const response = await client.getCompany();
        const company = response.data;

        return {
            success: true,
            data: {
                id: company.id,
                name: company.name,
                legalName: company.legalName,
                ein: company.ein,
                address: {
                    street1: company.address.street1,
                    street2: company.address.street2,
                    city: company.address.city,
                    state: company.address.state,
                    postalCode: company.address.postalCode,
                    country: company.address.country
                },
                phone: company.phone,
                website: company.website,
                industry: company.industry,
                employeeCount: company.employeeCount,
                foundedYear: company.foundedYear
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get company",
                retryable: true
            }
        };
    }
}
