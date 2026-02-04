import { z } from "zod";
import type { PlaidInstitutionOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PlaidClient } from "../client/PlaidClient";

export const getInstitutionSchema = z.object({
    institutionId: z.string().min(1).describe("The Plaid institution ID (e.g., ins_3)"),
    countryCodes: z
        .array(z.string())
        .optional()
        .default(["US"])
        .describe("Country codes to filter by")
});

export type GetInstitutionParams = z.infer<typeof getInstitutionSchema>;

export const getInstitutionOperation: OperationDefinition = {
    id: "getInstitution",
    name: "Get Institution",
    description: "Get details about a financial institution by ID",
    category: "institutions",
    inputSchema: getInstitutionSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetInstitution(
    client: PlaidClient,
    params: GetInstitutionParams
): Promise<OperationResult> {
    try {
        const response = await client.getInstitution(params.institutionId, params.countryCodes);
        const institution = response.institution;

        const formatted: PlaidInstitutionOutput = {
            institutionId: institution.institution_id,
            name: institution.name,
            products: institution.products,
            countryCodes: institution.country_codes,
            url: institution.url,
            logo: institution.logo,
            primaryColor: institution.primary_color
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
                message: error instanceof Error ? error.message : "Failed to get institution",
                retryable: true
            }
        };
    }
}
