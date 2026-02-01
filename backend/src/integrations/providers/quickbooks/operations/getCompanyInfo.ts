import { z } from "zod";
import type { QuickBooksCompanyInfoOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { QuickBooksClient } from "../client/QuickBooksClient";

export const getCompanyInfoSchema = z.object({});

export type GetCompanyInfoParams = z.infer<typeof getCompanyInfoSchema>;

export const getCompanyInfoOperation: OperationDefinition = {
    id: "getCompanyInfo",
    name: "Get Company Info",
    description: "Get information about the connected QuickBooks company",
    category: "company",
    inputSchema: getCompanyInfoSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetCompanyInfo(
    client: QuickBooksClient,
    _params: GetCompanyInfoParams
): Promise<OperationResult> {
    try {
        const response = await client.getCompanyInfo();
        const company = response.CompanyInfo;

        const formattedCompany: QuickBooksCompanyInfoOutput = {
            id: company.Id,
            companyName: company.CompanyName,
            legalName: company.LegalName,
            address: company.CompanyAddr
                ? {
                      line1: company.CompanyAddr.Line1,
                      city: company.CompanyAddr.City,
                      state: company.CompanyAddr.CountrySubDivisionCode,
                      postalCode: company.CompanyAddr.PostalCode,
                      country: company.CompanyAddr.Country
                  }
                : undefined,
            phone: company.PrimaryPhone?.FreeFormNumber,
            email: company.Email?.Address,
            website: company.WebAddr?.URI,
            fiscalYearStartMonth: company.FiscalYearStartMonth,
            country: company.Country
        };

        return {
            success: true,
            data: formattedCompany
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get company info",
                retryable: true
            }
        };
    }
}
