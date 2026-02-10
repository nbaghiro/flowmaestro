import { z } from "zod";
import type { SageBusinessInfoOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SageClient } from "../client/SageClient";

export const getBusinessInfoSchema = z.object({});

export type GetBusinessInfoParams = z.infer<typeof getBusinessInfoSchema>;

export const getBusinessInfoOperation: OperationDefinition = {
    id: "getBusinessInfo",
    name: "Get Business Info",
    description: "Get information about the connected Sage business",
    category: "business",
    inputSchema: getBusinessInfoSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetBusinessInfo(
    client: SageClient,
    _params: GetBusinessInfoParams
): Promise<OperationResult> {
    try {
        const business = await client.getBusiness();

        const formatted: SageBusinessInfoOutput = {
            name: business.name || "Unknown",
            countryCode: business.country_code,
            defaultCurrency: business.default_currency,
            industryType: business.industry_type,
            telephone: business.telephone,
            email: business.email,
            addressLine1: business.address_line_1,
            addressLine2: business.address_line_2,
            city: business.city,
            region: business.region,
            postalCode: business.postal_code,
            country: business.country,
            createdAt: business.created_at,
            updatedAt: business.updated_at
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
                message: error instanceof Error ? error.message : "Failed to get business info",
                retryable: true
            }
        };
    }
}
