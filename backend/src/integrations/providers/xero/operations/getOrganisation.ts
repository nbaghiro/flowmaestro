import { z } from "zod";
import type { XeroOrganisationOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { XeroClient } from "../client/XeroClient";

export const getOrganisationSchema = z.object({});

export type GetOrganisationParams = z.infer<typeof getOrganisationSchema>;

export const getOrganisationOperation: OperationDefinition = {
    id: "getOrganisation",
    name: "Get Organisation",
    description: "Get information about the connected Xero organisation",
    category: "organisation",
    inputSchema: getOrganisationSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetOrganisation(
    client: XeroClient,
    _params: GetOrganisationParams
): Promise<OperationResult> {
    try {
        const response = await client.getOrganisation();
        const organisations = response.Organisations || [];

        if (organisations.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "No organisation found for this Xero connection",
                    retryable: false
                }
            };
        }

        const org = organisations[0];
        const formatted: XeroOrganisationOutput = {
            organisationId: org.OrganisationID,
            name: org.Name,
            legalName: org.LegalName,
            shortCode: org.ShortCode,
            version: org.Version,
            organisationType: org.OrganisationType,
            baseCurrency: org.BaseCurrency,
            countryCode: org.CountryCode,
            isDemoCompany: org.IsDemoCompany,
            taxNumber: org.TaxNumber,
            financialYearEndDay: org.FinancialYearEndDay,
            financialYearEndMonth: org.FinancialYearEndMonth,
            lineOfBusiness: org.LineOfBusiness,
            registrationNumber: org.RegistrationNumber,
            createdDateUTC: org.CreatedDateUTC
        };

        return {
            success: true,
            data: formatted
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get organisation info",
                retryable: true
            }
        };
    }
}
