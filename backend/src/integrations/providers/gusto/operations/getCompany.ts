import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { GustoClient } from "../client/GustoClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Company operation schema
 */
export const getCompanySchema = z.object({
    companyId: z.string().describe("The Gusto company UUID")
});

export type GetCompanyParams = z.infer<typeof getCompanySchema>;

/**
 * Get Company operation definition
 */
export const getCompanyOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getCompany",
            name: "Get Company",
            description: "Get detailed company information from Gusto",
            category: "hr",
            actionType: "read",
            inputSchema: getCompanySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Gusto", err: error }, "Failed to create getCompanyOperation");
        throw new Error(
            `Failed to create getCompany operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get company operation
 */
export async function executeGetCompany(
    client: GustoClient,
    params: GetCompanyParams
): Promise<OperationResult> {
    try {
        const company = await client.getCompany(params.companyId);

        return {
            success: true,
            data: {
                uuid: company.uuid,
                name: company.name,
                tradeName: company.trade_name,
                ein: company.ein,
                entityType: company.entity_type,
                tier: company.tier,
                isSuspended: company.is_suspended,
                locations: company.locations?.map((loc) => ({
                    uuid: loc.uuid,
                    street1: loc.street_1,
                    street2: loc.street_2,
                    city: loc.city,
                    state: loc.state,
                    zip: loc.zip,
                    country: loc.country,
                    active: loc.active
                })),
                primarySignatory: company.primary_signatory
                    ? {
                          firstName: company.primary_signatory.first_name,
                          lastName: company.primary_signatory.last_name,
                          email: company.primary_signatory.email
                      }
                    : null,
                primaryPayrollAdmin: company.primary_payroll_admin
                    ? {
                          firstName: company.primary_payroll_admin.first_name,
                          lastName: company.primary_payroll_admin.last_name,
                          email: company.primary_payroll_admin.email
                      }
                    : null
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
